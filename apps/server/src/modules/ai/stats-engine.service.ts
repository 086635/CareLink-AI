import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElderPatternDto } from '@carelink/shared-types';
import { CareRecordEntity, DeviceEntity } from '../../infra/typeorm/entities';
import { RuleService } from '../rule/rule.service';

const SLOTS = ['00-03', '03-06', '06-09', '09-12', '12-15', '15-18', '18-21', '21-24'];

function slotOfHour(hour: number): string {
  const idx = Math.min(Math.floor(hour / 3), 7);
  return SLOTS[idx];
}

@Injectable()
export class StatsEngineService {
  constructor(
    @InjectRepository(CareRecordEntity)
    private readonly recordRepo: Repository<CareRecordEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    private readonly ruleService: RuleService,
  ) {}

  /**
   * L2 统计引擎：纯 SQL 聚合 + 数值计算，无 LLM 参与、无任何任务写操作（FR-AI-012 / R027）。
   * R022：数据不足时返回 insufficient=true，不输出任何规律结论（AC11）。
   * R023：设备离线时段标注"监测缺失"，不解释为无排泄事件。
   */
  async elderPatterns(orgId: string, elderId: string, days: number): Promise<ElderPatternDto> {
    const rules = await this.ruleService.getEffectiveRules(orgId);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 仅统计"已确认尿湿并更换"记录（checkResult=CONFIRMED_MOISTURE）
    const records = await this.recordRepo
      .createQueryBuilder('r')
      .where('r.orgId = :orgId AND r.elderId = :elderId', { orgId, elderId })
      .andWhere('r.executedAt >= :from', { from })
      .andWhere('r.checkResult = :confirmed', { confirmed: 'CONFIRMED_MOISTURE' })
      .orderBy('r.executedAt', 'ASC')
      .getMany();

    const validDays = new Set(records.map((r) => r.executedAt.toISOString().slice(0, 10))).size;
    const minEvents = rules.personalBaseline.minConfirmedEvents;
    const minValidDays = rules.personalBaseline.minValidDays;
    const insufficient = records.length < minEvents || validDays < minValidDays;

    const base: ElderPatternDto = {
      elderId,
      days,
      insufficient,
      insufficientReason: insufficient
        ? `有效数据不足：需要 ≥${minValidDays} 个有效天且 ≥${minEvents} 条已确认尿湿记录，当前 ${validDays} 天 / ${records.length} 条（R022）`
        : null,
      confirmedEventCount: records.length,
      avgResponseMinutes: null,
      monitoringCoverageRate: null,
      hourlyDistribution: SLOTS.map((slot) => ({ slot, count: 0 })),
      changeFrequency: { dailyAvg: null, intervalAvgHours: null },
      baseline: null,
      anomalyHints: [],
      offlineSpans: [],
      suggestions: [],
    };

    if (insufficient) {
      return base;
    }

    // 时段分布
    for (const r of records) {
      const slot = slotOfHour(r.executedAt.getHours());
      const item = base.hourlyDistribution.find((s) => s.slot === slot);
      if (item) item.count++;
    }

    // 更换频率
    const dailyAvg = records.length / days;
    let intervalSum = 0;
    let intervalCount = 0;
    for (let i = 1; i < records.length; i++) {
      const diff = records[i].executedAt.getTime() - records[i - 1].executedAt.getTime();
      if (diff > 0) {
        intervalSum += diff;
        intervalCount++;
      }
    }
    base.changeFrequency = {
      dailyAvg: Math.round(dailyAvg * 10) / 10,
      intervalAvgHours: intervalCount > 0 ? Math.round((intervalSum / intervalCount / 3600000) * 10) / 10 : null,
    };

    // 个人基线：各时段均值 ± sigmaMultiplier·σ
    const slotValues = new Map<string, number[]>();
    for (const r of records) {
      const slot = slotOfHour(r.executedAt.getHours());
      const arr = slotValues.get(slot) ?? [];
      arr.push(1);
      slotValues.set(slot, arr);
    }
    const sigma = rules.personalBaseline.sigmaMultiplier;
    base.baseline = {
      validDays,
      slots: SLOTS.map((slot) => {
        const arr = slotValues.get(slot) ?? [];
        const mean = arr.length / days;
        const variance = arr.length > 0 ? Math.abs(mean - arr.length / days) : 0;
        return {
          slot,
          mean: Math.round(mean * 100) / 100,
          upper: Math.round((mean + sigma * Math.sqrt(variance + mean)) * 100) / 100,
        };
      }),
    };

    // 异常偏离提示：近 24h 超基线上界
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = records.filter((r) => r.executedAt >= last24h);
    const recentBySlot = new Map<string, number>();
    for (const r of recent) {
      const slot = slotOfHour(r.executedAt.getHours());
      recentBySlot.set(slot, (recentBySlot.get(slot) ?? 0) + 1);
    }
    for (const b of base.baseline.slots) {
      const count = recentBySlot.get(b.slot) ?? 0;
      if (count > b.upper && b.upper > 0) {
        base.anomalyHints.push({
          date: new Date().toISOString().slice(0, 10),
          description: `${b.slot} 时段近 24h 已确认 ${count} 次，超过个人基线上界 ${b.upper}（辅助提示，R024）`,
        });
      }
    }

    // 监测缺失标注：设备离线时段（R023）
    const devices = await this.deviceRepo.find({ where: { orgId } });
    for (const device of devices) {
      if (device.onlineStatus === 'OFFLINE') {
        base.offlineSpans.push({
          from: device.lastSeenAt ? device.lastSeenAt.toISOString() : new Date().toISOString(),
          to: new Date().toISOString(),
        });
      }
    }

    // 检查时机建议：基线高频时段确定性计算，恒标"辅助建议"（R024/R027）
    const sorted = [...base.hourlyDistribution].sort((a, b) => b.count - a.count);
    const top = sorted.filter((s) => s.count > 0).slice(0, 2);
    base.suggestions = top.map((s) => ({
      timeSlot: s.slot,
      basis: `近 ${days} 天该时段已确认尿湿 ${s.count} 次（历史规律总结，辅助建议，不构成医学判断，不替代必要的人工检查）`,
    }));

    return base;
  }
}