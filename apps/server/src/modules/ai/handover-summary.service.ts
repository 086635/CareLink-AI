import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AiReportEntity,
  CareRecordEntity,
  CareTaskEntity,
  DeviceEntity,
} from '../../infra/typeorm/entities';
import { LlmProvider } from '../../infra/llm/llm-provider';
import { BusinessException } from '../../common/errors/business.exception';
import type { ContextBundle } from '@carelink/shared-types';

const MIN_RECORDS_FOR_LLM = 1;

@Injectable()
export class HandoverSummaryService {
  constructor(
    @InjectRepository(AiReportEntity)
    private readonly reportRepo: Repository<AiReportEntity>,
    @InjectRepository(CareRecordEntity)
    private readonly recordRepo: Repository<CareRecordEntity>,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    private readonly llmProvider: LlmProvider,
  ) {}

  /**
   * FR-REC-008/009/010：确定性程序组装 Context Bundle → 数据不足前置判定（R022）
   * → 受约束生成 → 校验 → AIReport 落库（R021/R026，AC10）。
   */
  async generate(
    orgId: string,
    operatorId: string,
    shiftFrom: string,
    shiftTo: string,
  ): Promise<AiReportEntity> {
    const from = new Date(shiftFrom);
    const to = new Date(shiftTo);

    // 确定性数据组装：仅使用数据库真实记录（R021）
    const records = await this.recordRepo
      .createQueryBuilder('r')
      .where('r.orgId = :orgId AND r.executedAt >= :from AND r.executedAt <= :to', { orgId, from, to })
      .orderBy('r.executedAt', 'ASC')
      .getMany();
    const openTasks = await this.taskRepo
      .createQueryBuilder('t')
      .where('t.orgId = :orgId', { orgId })
      .andWhere('t.status IN (:...statuses)', { statuses: ['UNASSIGNED', 'UNCLAIMED', 'PROCESSING'] })
      .getMany();
    const offlineDevices = await this.deviceRepo.find({
      where: { orgId, onlineStatus: 'OFFLINE' },
    });

    const dataRange = {
      from: from.toISOString(),
      to: to.toISOString(),
      sources: ['care_record', 'care_task', 'device'],
      description: `当班护理记录（${records.length} 条）、未完成任务（${openTasks.length} 项）、设备异常（${offlineDevices.length} 台）`,
    };

    const insufficient = records.length < MIN_RECORDS_FOR_LLM;

    if (insufficient) {
      // R022：数据不足时不调用 LLM，直接生成 insufficient_flag 报告，不虚构护理内容
      return this.reportRepo.save({
        orgId,
        type: 'HANDOVER_SUMMARY',
        elderId: null,
        content: {
          summary: `本班次（${from.toLocaleString('zh-CN')} 至 ${to.toLocaleString('zh-CN')}）护理记录数据不足（${records.length} 条），无法生成交接班摘要。`,
          items: [],
          caveats: ['数据不足：本班次无有效护理记录，未生成任何规律性结论（R022）'],
        },
        dataRange,
        insufficientFlag: true,
        degradedFlag: false,
        source: 'AI',
        createdById: operatorId,
      });
    }

    const bundle: ContextBundle = {
      reportType: '交接班摘要',
      dataRange: {
        from: from.toISOString(),
        to: to.toISOString(),
        sources: dataRange.sources,
      },
      facts: {
        careRecords: records.map((r) => ({
          executedAt: r.executedAt.toISOString(),
          checkResult: r.checkResult,
          careResult: r.careResult,
          note: r.note,
          simulated: r.simulated,
        })),
        openTasks: openTasks.map((t) => ({
          taskType: t.taskType,
          status: t.status,
          timeoutFlag: t.timeoutFlag,
          deadline: t.deadline.toISOString(),
          simulated: t.simulated,
        })),
        deviceAnomalies: offlineDevices.map((d) => ({
          deviceNo: d.deviceNo,
          lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
        })),
      },
    };

    const fallbackText = `本班次共完成护理登记 ${records.length} 次，当前未完成任务 ${openTasks.length} 项（超时 ${openTasks.filter((t) => t.timeoutFlag).length} 项），设备异常 ${offlineDevices.length} 台。`;
    const output = await this.llmProvider.generate(bundle, fallbackText);

    return this.reportRepo.save({
      orgId,
      type: 'HANDOVER_SUMMARY',
      elderId: null,
      content: JSON.parse(output.content) as Record<string, unknown>,
      dataRange,
      insufficientFlag: false,
      degradedFlag: output.degraded,
      source: 'AI',
      createdById: operatorId,
    });
  }

  async findById(id: string, orgId: string): Promise<AiReportEntity> {
    const report = await this.reportRepo.findOne({ where: { id, orgId } });
    if (!report) {
      throw BusinessException.notFound('报告不存在');
    }
    return report;
  }
}