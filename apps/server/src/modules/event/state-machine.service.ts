import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CareEventEntity, StatusTransitionLogEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

export type EventStatus = 'PENDING_CHECK' | 'PROCESSING' | 'COMPLETED' | 'FALSE_ALARM_CLOSED';

// R011 结构性保证：转换表中不存在"待核查 → 已完成"路径
const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  PENDING_CHECK: ['PROCESSING', 'FALSE_ALARM_CLOSED'],
  PROCESSING: ['COMPLETED', 'FALSE_ALARM_CLOSED'],
  COMPLETED: [],
  FALSE_ALARM_CLOSED: [],
};

export interface EventTransitionInput {
  eventId: string;
  orgId: string;
  toStatus: EventStatus;
  operatorId: string | null;
  reason?: string;
}

@Injectable()
export class EventStateMachineService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CareEventEntity)
    private readonly eventRepo: Repository<CareEventEntity>,
  ) {}

  assertTransition(from: EventStatus, to: EventStatus): void {
    const allowed = EVENT_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessException(4001, `非法状态转换：${from} → ${to}`);
    }
  }

  async transition(input: EventTransitionInput): Promise<CareEventEntity> {
    const { eventId, orgId, toStatus, operatorId, reason } = input;

    if (toStatus === 'FALSE_ALARM_CLOSED' && (!reason || reason.trim() === '')) {
      throw new BusinessException(4002, '误报关闭必须填写原因（R020）');
    }

    return this.dataSource.transaction(async (em) => {
      const event = await em.findOne(CareEventEntity, {
        where: { id: eventId, orgId },
      });
      if (!event) {
        throw BusinessException.scopeDenied('无权访问该事件');
      }
      this.assertTransition(event.status, toStatus);

      const fromStatus = event.status;
      // 条件 UPDATE 乐观并发：状态被并发修改时影响行数为 0
      const updateResult = await em
        .createQueryBuilder()
        .update(CareEventEntity)
        .set({
          status: toStatus,
          ...(toStatus === 'FALSE_ALARM_CLOSED' ? { falseAlarmReason: reason } : {}),
          ...(toStatus === 'COMPLETED' || toStatus === 'FALSE_ALARM_CLOSED' ? { dedupKey: null } : {}),
        })
        .where('id = :id AND status = :from', { id: eventId, from: fromStatus })
        .execute();
      if (updateResult.affected === 0) {
        throw new BusinessException(4001, '事件状态已被并发修改，请刷新后重试');
      }

      await em.save(StatusTransitionLogEntity, {
        entityType: 'EVENT',
        entityId: eventId,
        fromStatus,
        toStatus,
        operatorId,
        reason: reason ?? null,
      });

      event.status = toStatus;
      if (toStatus === 'FALSE_ALARM_CLOSED') {
        event.falseAlarmReason = reason ?? null;
      }
      return event;
    });
  }

  async transitionLogs(eventId: string): Promise<StatusTransitionLogEntity[]> {
    return this.dataSource.getRepository(StatusTransitionLogEntity).find({
      where: { entityType: 'EVENT', entityId: eventId },
      order: { createdAt: 'ASC' },
    });
  }
}