import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  CareTaskEntity,
  HandoverEntity,
  HandoverItemEntity,
} from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';
import { CaregiverService } from '../caregiver/caregiver.service';
import { NotificationService } from '../notification/notification.service';

export interface CreateHandoverInput {
  orgId: string;
  fromCaregiverId: string;
  toCaregiverId: string;
  shiftFrom: string;
  shiftTo: string;
  taskIds: string[];
  aiReportId?: string;
}

@Injectable()
export class HandoverService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(HandoverEntity)
    private readonly handoverRepo: Repository<HandoverEntity>,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    private readonly caregiverService: CaregiverService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * R019：交接班只移交负责人，任务状态保持不变、不触碰状态机、不自动关闭。
   * AC09：未完成任务正确移交且事后可查移交轨迹。
   */
  async create(input: CreateHandoverInput): Promise<HandoverEntity> {
    const toCaregiver = await this.caregiverService.findById(input.toCaregiverId);
    if (!toCaregiver || toCaregiver.orgId !== input.orgId || !toCaregiver.onDuty || toCaregiver.status !== 'ACTIVE') {
      throw new BusinessException(6001, '接班人已离岗或停用，不可交接');
    }
    if (input.taskIds.length === 0) {
      throw new BusinessException(6002, '移交清单不能为空');
    }
    const tasks = await this.taskRepo.find({
      where: { id: In(input.taskIds), orgId: input.orgId },
    });
    if (tasks.length !== input.taskIds.length) {
      throw new BusinessException(6002, '移交清单包含不存在或无权的任务');
    }
    const invalid = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED');
    if (invalid.length > 0) {
      throw new BusinessException(6002, `移交清单包含已结束任务（${invalid.length} 个），请刷新待办列表`);
    }

    return this.dataSource.transaction(async (em) => {
      const handover = em.create(HandoverEntity, {
        orgId: input.orgId,
        shiftFrom: new Date(input.shiftFrom),
        shiftTo: new Date(input.shiftTo),
        fromCaregiverId: input.fromCaregiverId,
        toCaregiverId: input.toCaregiverId,
        handedOverAt: new Date(),
        aiReportId: input.aiReportId ?? null,
      });
      const saved = await em.save(handover);

      for (const task of tasks) {
        const ownerBefore = task.ownerId;
        await em.update(CareTaskEntity, task.id, { ownerId: input.toCaregiverId });
        await em.save(HandoverItemEntity, {
          handoverId: saved.id,
          taskId: task.id,
          ownerBefore,
          ownerAfter: input.toCaregiverId,
        });
      }
      return saved;
    }).then(async (saved) => {
      await this.notificationService.notifyTaskAssigned(
        {
          taskId: '',
          orgId: input.orgId,
          ownerId: input.toCaregiverId,
          areaLocationId: null,
          elderName: null,
          bedLabel: null,
          deadline: new Date().toISOString(),
          timeoutFlag: false,
        },
        [input.toCaregiverId],
      );
      return saved;
    });
  }

  async list(orgId: string, page: number, pageSize: number) {
    const [list, total] = await this.handoverRepo.findAndCount({
      where: { orgId },
      order: { handedOverAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async detail(id: string, orgId: string) {
    const handover = await this.handoverRepo.findOne({ where: { id, orgId } });
    if (!handover) {
      throw BusinessException.scopeDenied('无权访问该交接班记录');
    }
    const items = await this.dataSource.getRepository(HandoverItemEntity).find({
      where: { handoverId: id },
    });
    const taskIds = items.map((i) => i.taskId);
    const tasks = taskIds.length > 0 ? await this.taskRepo.findByIds(taskIds) : [];
    return { ...handover, items: items.map((i) => ({ ...i, task: tasks.find((t) => t.id === i.taskId) ?? null })) };
  }
}