import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CareTaskEntity, StatusTransitionLogEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

export type TaskStatus = 'UNASSIGNED' | 'UNCLAIMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  UNASSIGNED: ['UNCLAIMED', 'PROCESSING', 'CANCELLED'],
  UNCLAIMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface TaskTransitionInput {
  taskId: string;
  orgId: string;
  toStatus: TaskStatus;
  operatorId: string | null;
  reason?: string;
  extraSet?: Record<string, unknown>;
}

@Injectable()
export class TaskStateMachineService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
  ) {}

  assertTransition(from: TaskStatus, to: TaskStatus): void {
    const allowed = TASK_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessException(4001, `非法任务状态转换：${from} → ${to}`);
    }
  }

  /**
   * R014 并发认领：单条条件 UPDATE 实现行级锁串行化，不用应用层锁。
   * 两名护理员并发认领同一任务时，仅一人成功。
   */
  async claim(taskId: string, orgId: string, caregiverId: string): Promise<CareTaskEntity> {
    const result = await this.dataSource.transaction(async (em) => {
      const updateResult = await em
        .createQueryBuilder()
        .update(CareTaskEntity)
        .set({
          ownerId: caregiverId,
          status: 'PROCESSING',
          claimedAt: new Date(),
        })
        .where(
          'id = :taskId AND orgId = :orgId AND status IN (:...statuses) AND ownerId IS NULL',
          { taskId, orgId, statuses: ['UNASSIGNED', 'UNCLAIMED'] as TaskStatus[] },
        )
        .execute();
      if (updateResult.affected === 0) {
        throw new BusinessException(5001, '任务已被认领或不可认领');
      }
      const task = await em.findOne(CareTaskEntity, { where: { id: taskId } });
      await em.save(StatusTransitionLogEntity, {
        entityType: 'TASK',
        entityId: taskId,
        fromStatus: null,
        toStatus: 'PROCESSING',
        operatorId: caregiverId,
        reason: '认领任务',
      });
      return task as CareTaskEntity;
    });
    return result;
  }

  async transition(input: TaskTransitionInput): Promise<CareTaskEntity> {
    const { taskId, orgId, toStatus, operatorId, reason, extraSet } = input;

    if (toStatus === 'CANCELLED' && (!reason || reason.trim() === '')) {
      throw new BusinessException(5003, '取消任务必须填写理由（R020）');
    }

    return this.dataSource.transaction(async (em) => {
      const task = await em.findOne(CareTaskEntity, { where: { id: taskId, orgId } });
      if (!task) {
        throw BusinessException.scopeDenied('无权访问该任务');
      }
      this.assertTransition(task.status, toStatus);

      const fromStatus = task.status;
      // timeout_flag 为独立标记列，任何状态转换不触碰它（R016）
      const updateResult = await em
        .createQueryBuilder()
        .update(CareTaskEntity)
        .set({
          status: toStatus,
          ...(toStatus === 'CANCELLED' ? { cancelReason: reason, effectiveKey: null } : {}),
          ...(toStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
          ...(extraSet ?? {}),
        })
        .where('id = :id AND status = :from', { id: taskId, from: fromStatus })
        .execute();
      if (updateResult.affected === 0) {
        throw new BusinessException(4001, '任务状态已被并发修改，请刷新后重试');
      }

      await em.save(StatusTransitionLogEntity, {
        entityType: 'TASK',
        entityId: taskId,
        fromStatus,
        toStatus,
        operatorId,
        reason: reason ?? null,
      });

      task.status = toStatus;
      return task;
    });
  }

  async transitionLogs(taskId: string): Promise<StatusTransitionLogEntity[]> {
    return this.dataSource.getRepository(StatusTransitionLogEntity).find({
      where: { entityType: 'TASK', entityId: taskId },
      order: { createdAt: 'ASC' },
    });
  }
}