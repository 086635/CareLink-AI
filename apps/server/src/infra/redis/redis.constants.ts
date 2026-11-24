export const REDIS_KEYS = {
  deviceOnline: (deviceId: string) => `device:online:${deviceId}`,
  session: (userId: string, jti: string) => `session:${userId}:${jti}`,
  dedupLock: (dedupKey: string) => `dedup:lock:${dedupKey}`,
  dashboard: (orgId: string) => `dashboard:${orgId}`,
  ruleCache: (orgId: string) => `rule:cache:${orgId}`,
} as const;

export const REDIS_TTL = {
  dedupLockSeconds: 5,
  dashboardSeconds: 300,
  sessionMaxSeconds: 2 * 60 * 60,
} as const;