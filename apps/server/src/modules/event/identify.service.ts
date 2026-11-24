import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CareEventType, EventCreatedPayload } from '@carelink/shared-types';
import {
  CareCycleEntity,
  CareEventEntity,
  CareTaskEntity,
  DeviceBindingEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { RuleService } from '../rule/rule.service';
import { NotificationService } from '../notification/notification.service';

export interface IncomingReading {
  metricType: 'MOISTURE' | 'BATTERY' | 'HEARTBEAT';
  metricValue: number;
  collectedAt: Date;
  quality: 'NORMAL' | 'INVALID';
}

export interface IdentifyResult {
  eventCreated: boolean;
  eventId: string | null;
}

const LOW_BATTERY_THRESHOLD = 20;

@Injectable()
export class IdentifyService {
  private readonly logger = new Logger(IdentifyService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CareEventEntity)
    private readonly eventRepo: Repository<CareEventEntity>,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
    private readonly ruleService: RuleService,
    private readonly notificationService: NotificationService,
  ) {}

  async processReading(device: DeviceEntity, reading: IncomingReading): Promise<IdentifyResult> {
    const rules = await this.ruleService.getEffectiveRules(device.orgId);

    if (reading.metricType === 'MOISTURE' && reading.quality === 'NORMAL') {
      if (reading.metricValue >= rules.moistureTrigger.threshold) {
        return this.createMoistureEvent(device, reading, rules.taskTimeout.MOISTURE_CARE);
      }
      // AC01：未满足触发条件的信号仅更新监测状态，不生成事件与任务
      return { eventCreated: false, eventId: null };
    }

    if (reading.metricType === 'BATTERY' && reading.metricValue <= LOW_BATTERY_THRESHOLD) {
      return this.createDeviceFaultEvent(device, reading, 'LOW_BATTERY', rules.taskTimeout.DEVICE_CHECK);
    }

    return { eventCreated: false, eventId: null };
  }

  async createMoistureEvent(
    device: DeviceEntity,
    reading: IncomingReading,
    timeoutMinutes: number,
  ): Promise<IdentifyResult> {
    return this.createEventInternal(device, reading, 'MOISTURE', 'MOISTURE_CARE', timeoutMinutes);
  }

  async createDeviceFaultEvent(
    device: DeviceEntity,
    reading: IncomingReading,
    faultKind: 'LOW_BATTERY' | 'OFFLINE',
    timeoutMinutes: number,
  ): Promise<IdentifyResult> {
    return this.createEventInternal(device, reading, 'DEVICE_FAULT', 'DEVICE_CHECK', timeoutMinutes, faultKind);
  }

  private async createEventInternal(
    device: DeviceEntity,
    reading: IncomingReading,
    eventType: 'MOISTURE' | 'DEVICE_FAULT',
    taskType: 'MOISTURE_CARE' | 'DEVICE_CHECK',
    timeoutMinutes: number,
    faultKind?: 'LOW_BATTERY' | 'OFFLINE',
  ): Promise<IdentifyResult> {
    const binding = await this.dataSource.getRepository(DeviceBindingEntity).findOne({
      where: { deviceId: device.id, endedAt: undefined },
    });
    const elderId = binding?.elderId ?? null;

    const cycle = elderId
      ? await this.dataSource.getRepository(CareCycleEntity).findOne({
          where: { deviceId: device.id, elderId, status: 'ACTIVE' },
          order: { startedAt: 'DESC' },
        })
      : null;

    const dedupKey =
      eventType === 'MOISTURE'
        ? `device:${device.id}:cycle:${cycle?.id ?? 'none'}:MOISTURE`
        : `device:${device.id}:fault:${faultKind}`;

    const triggerEvidence = {
      metricType: reading.metricType,
      metricValue: reading.metricValue,
      collectedAt: reading.collectedAt.toISOString(),
      rule: eventType === 'MOISTURE' ? 'moisture_trigger' : `device_fault:${faultKind}`,
      deviceId: device.id,
      deviceNo: device.deviceNo,
    };

    try {
      const created = await this.dataSource.transaction(async (em) => {
        const event = em.create(CareEventEntity, {
          orgId: device.orgId,
          eventType,
          status: 'PENDING_CHECK',
          elderId,
          deviceId: device.id,
          careCycleId: cycle?.id ?? null,
          triggerEvidence,
          triggeredAt: new Date(),
          lastSignalAt: new Date(),
          signalCount: 1,
          dedupKey,
          simulated: device.source === 'SIMULATED',
        });
        const savedEvent = await em.save(event);

        // R013：同事务创建初始任务；R004：elderId 为空（设备未绑定老人）不生成老人级任务
        if (elderId != null) {
          const elder = await em.findOne(ElderEntity, { where: { id: elderId } });
          const effectiveKey = `event:${savedEvent.id}:${taskType}`;
          const task = em.create(CareTaskEntity, {
            orgId: device.orgId,
            taskType,
            status: 'UNASSIGNED',
            sourceEventId: savedEvent.id,
            elderId,
            ownerId: null,
            areaLocationId: null,
            priority: elder?.careLevel ?? 1,
            deadline: new Date(Date.now() + timeoutMinutes * 60 * 1000),
            effectiveKey,
            simulated: device.source === 'SIMULATED',
          });
          await em.save(task);
        }
        return savedEvent;
      });

      await this.notifyEventCreated(device, created.id, elderId, eventType);
      return { eventCreated: true, eventId: created.id };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY') {
        // R008：同一护理周期内重复信号合并至同一未处理事件
        await this.mergeDuplicateSignal(dedupKey);
        return { eventCreated: false, eventId: null };
      }
      throw err;
    }
  }

  private async mergeDuplicateSignal(dedupKey: string): Promise<void> {
    await this.eventRepo
      .createQueryBuilder()
      .update(CareEventEntity)
      .set({ lastSignalAt: new Date(), signalCount: () => 'signal_count + 1' })
      .where('dedupKey = :dedupKey', { dedupKey })
      .execute();
  }

  private async notifyEventCreated(
    device: DeviceEntity,
    eventId: string,
    elderId: string | null,
    eventType: 'MOISTURE' | 'DEVICE_FAULT',
  ): Promise<void> {
    let elderName: string | null = null;
    if (elderId) {
      const elder = await this.elderRepo.findOne({ where: { id: elderId } });
      elderName = elder?.name ?? null;
    }
    const payload: EventCreatedPayload = {
      eventId,
      orgId: device.orgId,
      elderId,
      elderName,
      bedLabel: null,
      deviceId: device.id,
      deviceNo: device.deviceNo,
      eventType: eventType as CareEventType,
      triggeredAt: new Date().toISOString(),
      simulated: device.source === 'SIMULATED',
    };
    await this.notificationService.notifyEventCreated(payload);
  }
}