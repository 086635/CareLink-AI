import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiReportEntity, ElderEntity } from '../../infra/typeorm/entities';
import { StatsEngineService } from './stats-engine.service';
import { LlmProvider } from '../../infra/llm/llm-provider';
import { BusinessException } from '../../common/errors/business.exception';
import type { ContextBundle } from '@carelink/shared-types';

@Injectable()
export class CareReportService {
  constructor(
    @InjectRepository(AiReportEntity)
    private readonly reportRepo: Repository<AiReportEntity>,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
    private readonly statsEngine: StatsEngineService,
    private readonly llmProvider: LlmProvider,
  ) {}

  /**
   * FR-AI-006/009/010：个人照护报告 = L2 统计数据 + LLM 叙述组织 + data_range 落库（R026）。
   * R022：数据不足时明确说明，不生成虚假规律（AC11）。
   */
  async generateElderReport(
    orgId: string,
    elderId: string,
    operatorId: string,
    days: number,
  ): Promise<AiReportEntity> {
    const elder = await this.elderRepo.findOne({ where: { id: elderId, orgId } });
    if (!elder) {
      throw BusinessException.scopeDenied('无权访问该老人档案');
    }

    const patterns = await this.statsEngine.elderPatterns(orgId, elderId, days);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dataRange = {
      from: from.toISOString(),
      to: new Date().toISOString(),
      sources: ['care_record', 'care_event', 'device'],
      description: `近 ${days} 天个人护理记录与事件统计（已确认事件 ${patterns.confirmedEventCount} 条）`,
    };

    if (patterns.insufficient) {
      return this.reportRepo.save({
        orgId,
        type: 'CARE_REPORT',
        elderId,
        content: {
          summary: `老人 ${elder.name} 近 ${days} 天有效照护数据不足，无法生成个人照护报告。`,
          items: [],
          caveats: [patterns.insufficientReason ?? '数据不足（R022）'],
        },
        dataRange,
        insufficientFlag: true,
        degradedFlag: false,
        source: 'AI',
        createdById: operatorId,
      });
    }

    const bundle: ContextBundle = {
      reportType: '个人照护报告',
      dataRange: {
        from: dataRange.from,
        to: dataRange.to,
        sources: dataRange.sources,
      },
      facts: {
        elderName: elder.name,
        careLevel: elder.careLevel,
        confirmedEventCount: patterns.confirmedEventCount,
        hourlyDistribution: patterns.hourlyDistribution,
        changeFrequency: patterns.changeFrequency,
        anomalyHints: patterns.anomalyHints,
        offlineSpans: patterns.offlineSpans,
        suggestions: patterns.suggestions,
      },
    };

    const fallbackText = `老人 ${elder.name} 近 ${days} 天已确认尿湿事件 ${patterns.confirmedEventCount} 次，日均更换 ${patterns.changeFrequency.dailyAvg} 次。${patterns.suggestions.map((s) => `${s.timeSlot} 时段为高频时段。`).join('')}`;
    const output = await this.llmProvider.generate(bundle, fallbackText);

    return this.reportRepo.save({
      orgId,
      type: 'CARE_REPORT',
      elderId,
      content: JSON.parse(output.content) as Record<string, unknown>,
      dataRange,
      insufficientFlag: false,
      degradedFlag: output.degraded,
      source: 'AI',
      createdById: operatorId,
    });
  }

  /**
   * FR-AI-005：检查时机建议，恒标"辅助建议"（R024）；
   * 建议层无任何创建/修改/取消任务的代码路径（R027）——本方法只读。
   */
  async suggestions(orgId: string, elderId: string, days: number) {
    const patterns = await this.statsEngine.elderPatterns(orgId, elderId, days);
    return {
      elderId,
      insufficient: patterns.insufficient,
      insufficientReason: patterns.insufficientReason,
      suggestions: patterns.suggestions.map((s) => ({
        ...s,
        label: '辅助建议（不替代护理人员判断与必要的人工检查，R024/R027）',
      })),
    };
  }

  async findReport(id: string, orgId: string): Promise<AiReportEntity> {
    const report = await this.reportRepo.findOne({ where: { id, orgId } });
    if (!report) {
      throw BusinessException.notFound('报告不存在');
    }
    return report;
  }
}