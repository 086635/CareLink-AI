import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from './redis.constants';

export interface DeviceOnlineSnapshot {
  lastSeen: string;
  metricType: string;
  metricValue: number;
  battery: number | null;
  simulated: boolean;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async setDeviceSnapshot(deviceId: string, snapshot: DeviceOnlineSnapshot): Promise<void> {
    await this.client.hset(REDIS_KEYS.deviceOnline(deviceId), {
      lastSeen: snapshot.lastSeen,
      metricType: snapshot.metricType,
      metricValue: String(snapshot.metricValue),
      battery: snapshot.battery == null ? '' : String(snapshot.battery),
      simulated: snapshot.simulated ? '1' : '0',
    });
  }

  async getDeviceSnapshot(deviceId: string): Promise<DeviceOnlineSnapshot | null> {
    const raw = await this.client.hgetall(REDIS_KEYS.deviceOnline(deviceId));
    if (raw.lastSeen == null) return null;
    return {
      lastSeen: raw.lastSeen,
      metricType: raw.metricType,
      metricValue: Number(raw.metricValue),
      battery: raw.battery === '' ? null : Number(raw.battery),
      simulated: raw.simulated === '1',
    };
  }

  async setSession(userId: string, jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(REDIS_KEYS.session(userId, jti), '1', 'EX', ttlSeconds);
  }

  async hasSession(userId: string, jti: string): Promise<boolean> {
    const v = await this.client.exists(REDIS_KEYS.session(userId, jti));
    return v === 1;
  }

  async revokeSession(userId: string, jti: string): Promise<void> {
    await this.client.del(REDIS_KEYS.session(userId, jti));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const pattern = `session:${userId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async acquireDedupLock(dedupKey: string): Promise<boolean> {
    const r = await this.client.set(REDIS_KEYS.dedupLock(dedupKey), '1', 'EX', REDIS_TTL.dedupLockSeconds, 'NX');
    return r === 'OK';
  }

  async releaseDedupLock(dedupKey: string): Promise<void> {
    await this.client.del(REDIS_KEYS.dedupLock(dedupKey));
  }

  async setDashboardCounts(orgId: string, counts: Record<string, number>): Promise<void> {
    const key = REDIS_KEYS.dashboard(orgId);
    await this.client.hset(key, Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, String(v)])));
    await this.client.expire(key, REDIS_TTL.dashboardSeconds);
  }

  async getDashboardCounts(orgId: string): Promise<Record<string, number> | null> {
    const raw = await this.client.hgetall(REDIS_KEYS.dashboard(orgId));
    if (Object.keys(raw).length === 0) return null;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      result[k] = Number(v);
    }
    return result;
  }

  async invalidateDashboard(orgId: string): Promise<void> {
    await this.client.del(REDIS_KEYS.dashboard(orgId));
  }

  async setRuleSnapshot(orgId: string, rules: Record<string, unknown>): Promise<void> {
    await this.client.hset(REDIS_KEYS.ruleCache(orgId), Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, JSON.stringify(v)])));
  }

  async getRuleSnapshot(orgId: string): Promise<Record<string, unknown> | null> {
    const raw = await this.client.hgetall(REDIS_KEYS.ruleCache(orgId));
    if (Object.keys(raw).length === 0) return null;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      result[k] = JSON.parse(v);
    }
    return result;
  }

  async invalidateRuleCache(orgId: string): Promise<void> {
    await this.client.del(REDIS_KEYS.ruleCache(orgId));
  }
}