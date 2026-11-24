const PHONE_RE = /1\d{10}/g;

export function maskPhone(text: string): string {
  return text.replace(PHONE_RE, (m) => `${m.slice(0, 3)}****${m.slice(7)}`);
}

export function maskName(name: string): string {
  if (name.length <= 1) return name;
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(name.length - 1, 1))}`;
}

export function sanitizeForLog(value: unknown, depth = 0): string {
  if (value == null) return '';
  if (typeof value === 'string') return maskPhone(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (depth >= 3) return '[object]';
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForLog(v, depth + 1)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !['password', 'passwordHash', 'deviceKey', 'deviceKeyHash', 'secret'].includes(k))
      .map(([k, v]) => `${k}=${sanitizeForLog(v, depth + 1)}`);
    return entries.join(' ');
  }
  return '';
}