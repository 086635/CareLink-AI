import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleConfigEntity } from '../../infra/typeorm/entities';
import { RedisService } from '../../infra/redis/redis.service';
import { BusinessException } from '../../common/errors/business.exception';

export interface MoistureTriggerRule {
  threshold: number;
  durationSeconds: number;
  note?: string;
}

export interface DeviceOfflineRule {
  offlineSeconds: number;
}

export interface TaskTimeoutRule {
  MOISTURE_CARE: number;
  DEVICE_CHECK: number;
  MANUAL_CHECK: number;
}

export interface TaskSortWeightsRule {
  careLevel: number;
  deadline: number;
  waitMinutes: number;
}

export interface PersonalBaselineRule {
  windowDays: number;
  minValidDays: number;
  sigmaMultiplier: number;
  minConfirmedEvents: number;
}

export interface EffectiveRules {
  moistureTrigger: MoistureTriggerRule;
  deviceOffline: DeviceOfflineRule;
  taskTimeout: TaskTimeoutRule;
  taskSortWeights: TaskSortWeightsRule;
  personalBaseline: PersonalBaselineRule;
}

const RULE_KEYS = [
  'moisture_trigger',
  'device_offline',
  'task_timeout',
  'task_sort_weights',
  'personal_baseline',
] as const;

type RuleKey = (typeof RULE_KEYS)[number];

@Injectable()
export class RuleService {
  constructor(
    @InjectRepository(RuleConfigEntity)
    private readonly ruleRepo: Repository<RuleConfigEntity>,
    private readonly redis: RedisService,
  ) {}

  async listForOrg(orgId: string): Promise<RuleConfigEntity[]> {
    return this.ruleRepo
      .createQueryBuilder('r')
      .where('r.orgId IS NULL OR r.orgId = :orgId', { orgId })
      .orderBy('r.orgId', 'ASC')
      .getMany();
  }

  async update(id: string, orgId: string, ruleValue: Record<string, unknown>): Promise<RuleConfigEntity> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule || (rule.orgId != null && rule.orgId !== orgId)) {
      throw BusinessException.notFound('规则不存在');
    }
    rule.ruleValue = ruleValue;
    const saved = await this.ruleRepo.save(rule);
    await this.redis.invalidateRuleCache(orgId);
    return saved;
  }

  async getEffectiveRules(orgId: string): Promise<EffectiveRules> {
    const cached = await this.redis.getRuleSnapshot(orgId);
    if (cached) {
      return this.asEffectiveRules(cached);
    }
    const rows = await this.listForOrg(orgId);
    const snapshot: Record<string, unknown> = {};
    for (const key of RULE_KEYS) {
      const orgRow = rows.find((r) => r.orgId === orgId && r.ruleKey === key);
      const globalRow = rows.find((r) => r.orgId == null && r.ruleKey === key);
      snapshot[key] = (orgRow ?? globalRow)?.ruleValue ?? {};
    }
    await this.redis.setRuleSnapshot(orgId, snapshot);
    return this.asEffectiveRules(snapshot);
  }

  private asEffectiveRules(snapshot: Record<string, unknown>): EffectiveRules {
    return {
      moistureTrigger: {
        threshold: 60,
        durationSeconds: 0,
        ...(snapshot.moisture_trigger as MoistureTriggerRule | undefined),
      },
      deviceOffline: {
        offlineSeconds: 180,
        ...(snapshot.device_offline as DeviceOfflineRule | undefined),
      },
      taskTimeout: {
        MOISTURE_CARE: 30,
        DEVICE_CHECK: 15,
        MANUAL_CHECK: 30,
        ...(snapshot.task_timeout as TaskTimeoutRule | undefined),
      },
      taskSortWeights: {
        careLevel: 100,
        deadline: 50,
        waitMinutes: 1,
        ...(snapshot.task_sort_weights as TaskSortWeightsRule | undefined),
      },
      personalBaseline: {
        windowDays: 14,
        minValidDays: 7,
        sigmaMultiplier: 1.5,
        minConfirmedEvents: 10,
        ...(snapshot.personal_baseline as PersonalBaselineRule | undefined),
      },
    };
  }
}

export type { RuleKey };