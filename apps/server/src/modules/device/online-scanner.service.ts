import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceEntity } from '../../infra/typeorm/entities';
import { RuleService } from '../rule/rule.service';
import { IdentifyService } from '../event/identify.service';
import { NotificationService } from '../notification/notification.service';
import { DeviceOfflinePayload } from '@carelink/shared-types';

@Injectable()
export class OnlineScannerService {
  private readonly logger = new Logger(OnlineScannerService.name);

  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    private readonly ruleService: RuleService,
    private readonly identifyService: IdentifyService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('*/30 * * * * *')
  async scanOfflineDevices(): Promise<void> {
    try {
      const onlineDevices = await this.deviceRepo.find({
        where: { onlineStatus: 'ONLINE', status: 'ACTIVE' },
      });
      if (onlineDevices.length === 0) return;

      const orgRulesCache = new Map<string, number>();
      const timeoutDevices: DeviceEntity[] = [];

      for (const device of onlineDevices) {
        let offlineSeconds = orgRulesCache.get(device.orgId);
        if (offlineSeconds == null) {
          const rules = await this.ruleService.getEffectiveRules(device.orgId);
          offlineSeconds = rules.deviceOffline.offlineSeconds;
          orgRulesCache.set(device.orgId, offlineSeconds);
        }
        const lastSeen = device.lastSeenAt ? device.lastSeenAt.getTime() : 0;
        if (Date.now() - lastSeen > offlineSeconds * 1000) {
          timeoutDevices.push(device);
        }
      }
      if (timeoutDevices.length === 0) return;

      await this.deviceRepo.update(
        { id: In(timeoutDevices.map((d) => d.id)) },
        { onlineStatus: 'OFFLINE' },
      );

      const rules = await this.ruleService.getEffectiveRules(timeoutDevices[0].orgId);
      for (const device of timeoutDevices) {
        // R009：设备故障事件独立于尿湿事件；dedup_key 保证重复扫描不产生重复故障事件
        await this.identifyService.createDeviceFaultEvent(
          device,
          { metricType: 'HEARTBEAT', metricValue: 0, collectedAt: new Date(), quality: 'NORMAL' },
          'OFFLINE',
          rules.taskTimeout.DEVICE_CHECK,
        );
        const payload: DeviceOfflinePayload = {
          deviceId: device.id,
          orgId: device.orgId,
          deviceNo: device.deviceNo,
          elderId: null,
          lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
        };
        await this.notificationService.notifyDeviceOffline(payload);
        this.logger.warn(`设备离线: ${device.deviceNo}（已生成故障事件并提醒人工检查，R005/NFR-005）`);
      }
    } catch (err) {
      this.logger.error(`离线扫描失败: ${(err as Error).message}`);
    }
  }

  async markDeviceOnline(deviceId: string): Promise<void> {
    await this.deviceRepo.update({ id: deviceId }, { onlineStatus: 'ONLINE', lastSeenAt: new Date() });
  }
}