import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeviceOfflinePayload,
  EventCreatedPayload,
  TaskAssignedPayload,
  TaskTimeoutPayload,
} from '@carelink/shared-types';
import { NotificationEntity } from '../../infra/typeorm/entities';
import { WsGateway } from '../../infra/ws/ws.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    private readonly wsGateway: WsGateway,
  ) {}

  async notifyEventCreated(payload: EventCreatedPayload): Promise<void> {
    await this.persistAndPush(payload.orgId, null, 'EVENT_CREATED', '新的照护事件待核查', payload, 'CARE_EVENT', payload.eventId, (orgId) =>
      this.wsGateway.emitToOrg(orgId, 'event:created', payload),
    );
  }

  async notifyTaskAssigned(payload: TaskAssignedPayload, receiverIds: string[]): Promise<void> {
    for (const receiverId of receiverIds) {
      await this.persistAndPush(
        payload.orgId,
        receiverId,
        'TASK_ASSIGNED',
        '有新的护理任务需要处理',
        payload,
        'CARE_TASK',
        payload.taskId,
        (_orgId) => this.wsGateway.emitToUser(receiverId, 'task:assigned', payload),
      );
    }
  }

  async notifyTaskTransferred(payload: TaskAssignedPayload, receiverId: string | null): Promise<void> {
    if (!receiverId) return;
    await this.persistAndPush(
      payload.orgId,
      receiverId,
      'TASK_TRANSFERRED',
      '有护理任务转派给您',
      payload,
      'CARE_TASK',
      payload.taskId,
      (_orgId) => this.wsGateway.emitToUser(receiverId, 'task:transferred', payload),
    );
  }

  async notifyTaskTimeout(payload: TaskTimeoutPayload, receiverIds: string[]): Promise<void> {
    for (const receiverId of receiverIds) {
      await this.persistAndPush(
        payload.orgId,
        receiverId,
        'TASK_TIMEOUT',
        '护理任务已超时，请尽快处理',
        payload,
        'CARE_TASK',
        payload.taskId,
        (_orgId) => this.wsGateway.emitToUser(receiverId, 'task:timeout', payload),
      );
    }
  }

  async notifyDeviceOffline(payload: DeviceOfflinePayload): Promise<void> {
    await this.persistAndPush(payload.orgId, null, 'DEVICE_OFFLINE', '设备离线，请安排人工检查', payload, 'DEVICE', payload.deviceId, (orgId) =>
      this.wsGateway.emitToOrg(orgId, 'device:offline', payload),
    );
  }

  async notifyDeviceWarning(payload: DeviceOfflinePayload, title: string): Promise<void> {
    await this.persistAndPush(payload.orgId, null, 'DEVICE_WARNING', title, payload, 'DEVICE', payload.deviceId, (orgId) =>
      this.wsGateway.emitToOrg(orgId, 'device:warning', payload),
    );
  }

  private async persistAndPush(
    orgId: string,
    receiverId: string | null,
    type: string,
    title: string,
    payload: object,
    relatedType: string,
    relatedId: string,
    push: (orgId: string) => void,
  ): Promise<void> {
    try {
      push(orgId);
    } catch {
      // 推送失败不影响持久化
    }
    if (receiverId != null) {
      await this.notificationRepo.save({
        orgId,
        receiverId,
        type,
        title,
        payload: payload as Record<string, unknown>,
        relatedType,
        relatedId,
      });
    }
  }

  async listForReceiver(receiverId: string, page: number, pageSize: number) {
    const [list, total] = await this.notificationRepo.findAndCount({
      where: { receiverId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async markRead(id: string, receiverId: string): Promise<void> {
    await this.notificationRepo.update({ id, receiverId }, { isRead: true });
  }
}