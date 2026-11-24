import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareRecordEntity, CareTaskEntity, ElderEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

export interface RecordFilter {
  elderId?: string;
  executorId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(CareRecordEntity)
    private readonly recordRepo: Repository<CareRecordEntity>,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
  ) {}

  async list(orgId: string, filter: RecordFilter) {
    const qb = this.recordRepo
      .createQueryBuilder('r')
      .where('r.orgId = :orgId', { orgId })
      .orderBy('r.executedAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);
    if (filter.elderId) {
      qb.andWhere('r.elderId = :elderId', { elderId: filter.elderId });
    }
    if (filter.executorId) {
      qb.andWhere('r.executorId = :executorId', { executorId: filter.executorId });
    }
    if (filter.from) {
      qb.andWhere('r.executedAt >= :from', { from: new Date(filter.from) });
    }
    if (filter.to) {
      qb.andWhere('r.executedAt <= :to', { to: new Date(filter.to) });
    }
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: filter.page, pageSize: filter.pageSize };
  }

  async createAbnormalRecord(
    orgId: string,
    executorId: string,
    input: {
      taskId: string;
      skinAbnormal?: boolean;
      note: string;
    },
  ): Promise<CareRecordEntity> {
    const task = await this.taskRepo.findOne({ where: { id: input.taskId, orgId } });
    if (!task) {
      throw BusinessException.scopeDenied('无权访问该任务');
    }
    if (task.elderId == null) {
      throw BusinessException.badRequest('任务未关联老人');
    }
    const elder = await this.elderRepo.findOne({ where: { id: task.elderId } });
    const record = this.recordRepo.create({
      orgId,
      taskId: task.id,
      eventId: task.sourceEventId,
      elderId: task.elderId,
      deviceId: null,
      executorId,
      executedAt: new Date(),
      checkResult: 'NEED_FURTHER',
      careResult: 'NEED_FURTHER',
      skinAbnormal: input.skinAbnormal ?? null,
      note: input.note,
      simulated: task.simulated,
    });
    void elder;
    return this.recordRepo.save(record);
  }
}