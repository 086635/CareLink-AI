import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareEventEntity, CareTaskEntity } from '../../infra/typeorm/entities';

export interface EventStats {
  pending: number;
  completed: number;
  falseAlarm: number;
  timeout: number;
  total: number;
}

export interface ResponseTimeStats {
  avgMinutes: number | null;
  p50Minutes: number | null;
  p90Minutes: number | null;
  samples: number;
}

export interface CompletionRateStats {
  completed: number;
  cancelled: number;
  open: number;
  completionRate: number;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(CareEventEntity)
    private readonly eventRepo: Repository<CareEventEntity>,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
  ) {}

  private simulatedFilter(simulated?: boolean): boolean | undefined {
    return simulated === undefined ? undefined : simulated;
  }

  async eventStats(orgId: string, simulated?: boolean): Promise<EventStats> {
    const qb = this.eventRepo.createQueryBuilder('e').where('e.orgId = :orgId', { orgId });
    if (simulated !== undefined) {
      qb.andWhere('e.simulated = :simulated', { simulated });
    }
    const rows = await qb.getMany();
    const pending = rows.filter((e) => e.status === 'PENDING_CHECK' || e.status === 'PROCESSING').length;
    const completed = rows.filter((e) => e.status === 'COMPLETED').length;
    const falseAlarm = rows.filter((e) => e.status === 'FALSE_ALARM_CLOSED').length;
    const timeout = rows.filter((e) => e.eventType === 'MOISTURE').length > 0
      ? await this.taskRepo
          .createQueryBuilder('t')
          .where('t.orgId = :orgId', { orgId })
          .andWhere('t.timeoutFlag = :flag', { flag: true })
          .andWhere('t.simulated = :sim', { sim: this.simulatedFilter(simulated) ?? false })
          .getCount()
      : 0;
    return { pending, completed, falseAlarm, timeout, total: rows.length };
  }

  /**
   * FR-OPS-003：响应时长 = 事件触发（triggered_at）至护理响应（任务 claimed_at），
   * 纯确定性计算（FR-AI-012）；排除误报关闭样本。
   */
  async responseTime(orgId: string, simulated?: boolean): Promise<ResponseTimeStats> {
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .innerJoin(CareEventEntity, 'e', 'e.id = t.sourceEventId')
      .where('t.orgId = :orgId', { orgId })
      .andWhere('t.claimedAt IS NOT NULL')
      .andWhere('e.status != :falseAlarm', { falseAlarm: 'FALSE_ALARM_CLOSED' });
    if (simulated !== undefined) {
      qb.andWhere('t.simulated = :simulated', { simulated });
    }
    const rows = await qb
      .select('TIMESTAMPDIFF(SECOND, e.triggeredAt, t.claimedAt) AS diffSeconds')
      .getRawMany<{ diffSeconds: number }>();
    if (rows.length === 0) {
      return { avgMinutes: null, p50Minutes: null, p90Minutes: null, samples: 0 };
    }
    const seconds = rows.map((r) => Number(r.diffSeconds)).filter((n) => Number.isFinite(n) && n >= 0);
    seconds.sort((a, b) => a - b);
    const avg = seconds.reduce((s, v) => s + v, 0) / seconds.length;
    const p50 = seconds[Math.floor(seconds.length * 0.5)];
    const p90 = seconds[Math.floor(seconds.length * 0.9)];
    return {
      avgMinutes: Math.round((avg / 60) * 10) / 10,
      p50Minutes: Math.round((p50 / 60) * 10) / 10,
      p90Minutes: Math.round((p90 / 60) * 10) / 10,
      samples: seconds.length,
    };
  }

  async completionRate(orgId: string, simulated?: boolean): Promise<CompletionRateStats> {
    const qb = this.taskRepo.createQueryBuilder('t').where('t.orgId = :orgId', { orgId });
    if (simulated !== undefined) {
      qb.andWhere('t.simulated = :simulated', { simulated });
    }
    const rows = await qb.getMany();
    const completed = rows.filter((t) => t.status === 'COMPLETED').length;
    const cancelled = rows.filter((t) => t.status === 'CANCELLED').length;
    const open = rows.filter((t) => t.status === 'UNASSIGNED' || t.status === 'UNCLAIMED' || t.status === 'PROCESSING').length;
    const effective = completed + cancelled + open;
    return {
      completed,
      cancelled,
      open,
      completionRate: effective === 0 ? 0 : Math.round((completed / effective) * 1000) / 10,
    };
  }
}