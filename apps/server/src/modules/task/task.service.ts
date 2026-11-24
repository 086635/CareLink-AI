import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CareTaskEntity,
  ElderEntity,
  StatusTransitionLogEntity,
} from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';
import { RuleService } from '../rule/rule.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { TaskStateMachineService } from './state-machine.service';

export interface TaskListFilter {
  assignee?: string;
  status?: string[];
  page: number;
  pageSize: number;
}

@Injectable()
export class TaskService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    private readonly ruleService: RuleService,
    private readonly caregiverService: CaregiverService,
    private readonly stateMachine: TaskStateMachineService,
  ) {}

  async list(orgId: string, filter: TaskListFilter) {
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.orgId = :orgId', { orgId })
      .andWhere('t.status IN (:...openStatuses)', {
        openStatuses: filter.status ?? ['UNASSIGNED', 'UNCLAIMED', 'PROCESSING'],
      });
    if (filter.assignee) {
      qb.andWhere('t.ownerId = :assignee', { assignee: filter.assignee });
    }
    const [list, total] = await qb
      .orderBy('t.priority', 'DESC')
      .addOrderBy('t.deadline', 'ASC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize)
      .getManyAndCount();

    const elderIds = list.map((t) => t.elderId).filter((id): id is string => id != null);
    const elders = elderIds.length > 0 ? await this.dataSource.getRepository(ElderEntity).findByIds(elderIds) : [];
    const elderMap = new Map(elders.map((e) => [e.id, e]));
    const ownerIds = list.map((t) => t.ownerId).filter((id): id is string => id != null);
    const owners = ownerIds.length > 0 ? await this.caregiverService.findByIds(orgId, ownerIds) : [];
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    return {
      list: list.map((t) => ({
        ...t,
        elderName: t.elderId ? elderMap.get(t.elderId)?.name ?? null : null,
        ownerName: t.ownerId ? ownerMap.get(t.ownerId)?.name ?? null : null,
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async detail(id: string, orgId: string): Promise<Record<string, unknown>> {
    const task = await this.taskRepo.findOne({ where: { id, orgId } });
    if (!task) {
      throw BusinessException.scopeDenied('无权访问该任务');
    }
    const logs = await this.stateMachine.transitionLogs(id);
    const elder = task.elderId
      ? await this.dataSource.getRepository(ElderEntity).findOne({ where: { id: task.elderId } })
      : null;
    const owner = task.ownerId ? await this.caregiverService.findById(task.ownerId) : null;
    return {
      ...task,
      elderName: elder?.name ?? null,
      ownerName: owner?.name ?? null,
      transitionLogs: logs,
    };
  }

  async createManual(
    orgId: string,
    input: {
      elderId: string;
      taskType: 'MOISTURE_CARE' | 'DEVICE_CHECK' | 'MANUAL_CHECK';
      note?: string;
      ownerId?: string;
      areaLocationId?: string;
      deadlineMinutes?: number;
      createdById: string;
    },
  ): Promise<CareTaskEntity> {
    const rules = await this.ruleService.getEffectiveRules(orgId);
    const timeoutMinutes = input.deadlineMinutes ?? rules.taskTimeout[input.taskType] ?? 30;

    if (input.ownerId) {
      await this.caregiverService.assertOnDuty(input.ownerId);
    }
    const elder = await this.dataSource.getRepository(ElderEntity).findOne({
      where: { id: input.elderId, orgId },
    });
    if (!elder) {
      throw BusinessException.badRequest('老人不存在');
    }

    const task = this.taskRepo.create({
      orgId,
      taskType: input.taskType,
      status: input.ownerId ? 'UNCLAIMED' : 'UNASSIGNED',
      sourceEventId: null,
      createdById: input.createdById,
      elderId: input.elderId,
      ownerId: input.ownerId ?? null,
      areaLocationId: input.areaLocationId ?? null,
      priority: elder.careLevel,
      deadline: new Date(Date.now() + timeoutMinutes * 60 * 1000),
      cancelReason: null,
      effectiveKey: null,
      simulated: false,
    });
    return this.taskRepo.save(task);
  }

  async assign(
    id: string,
    orgId: string,
    input: { ownerId?: string; areaLocationId?: string },
    operatorId: string,
  ): Promise<CareTaskEntity> {
    const task = await this.taskRepo.findOne({ where: { id, orgId } });
    if (!task) {
      throw BusinessException.scopeDenied('无权访问该任务');
    }
    if (task.status !== 'UNASSIGNED') {
      throw new BusinessException(4001, '仅待分配任务可分配');
    }
    if (input.ownerId) {
      await this.caregiverService.assertOnDuty(input.ownerId);
      return this.stateMachine.transition({
        taskId: id,
        orgId,
        toStatus: 'UNCLAIMED',
        operatorId,
        reason: `分配给负责人 ${input.ownerId}`,
        extraSet: { ownerId: input.ownerId },
      });
    }
    if (input.areaLocationId) {
      await this.taskRepo.update(id, { areaLocationId: input.areaLocationId });
      return this.taskRepo.findOne({ where: { id } }) as Promise<CareTaskEntity>;
    }
    throw BusinessException.badRequest('ownerId 与 areaLocationId 至少提供一项');
  }

  async transfer(
    id: string,
    orgId: string,
    input: { newOwnerId: string; reason: string },
    operatorId: string,
  ): Promise<CareTaskEntity> {
    // R018：转派必须记录原负责人、新负责人及原因
    const task = await this.taskRepo.findOne({ where: { id, orgId } });
    if (!task) {
      throw BusinessException.scopeDenied('无权访问该任务');
    }
    await this.caregiverService.assertOnDuty(input.newOwnerId);
    const ownerBefore = task.ownerId;
    await this.taskRepo.update(id, { ownerId: input.newOwnerId });
    await this.dataSource.getRepository(StatusTransitionLogEntity).save({
      entityType: 'TASK',
      entityId: id,
      fromStatus: task.status,
      toStatus: task.status,
      operatorId,
      reason: `转派：原负责人=${ownerBefore ?? '无'}，新负责人=${input.newOwnerId}，原因=${input.reason}`,
    });
    return this.taskRepo.findOne({ where: { id } }) as Promise<CareTaskEntity>;
  }

  async cancel(
    id: string,
    orgId: string,
    reason: string,
    operatorId: string,
  ): Promise<CareTaskEntity> {
    // R020：取消理由必填（状态机内校验，缺失返回 5003）
    return this.stateMachine.transition({
      taskId: id,
      orgId,
      toStatus: 'CANCELLED',
      operatorId,
      reason,
    });
  }
}
