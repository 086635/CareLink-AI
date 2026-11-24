import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogEntity } from '../../infra/typeorm/entities';
import { sanitizeForLog } from '../utils/masking.util';
import type { AuthUser } from '../auth/auth-user';

const OBJECT_TYPE_ROUTES: { pattern: RegExp; type: string }[] = [
  { pattern: /\/v1\/orgs(\/|$)/, type: 'ORG' },
  { pattern: /\/v1\/locations(\/|$)/, type: 'LOCATION' },
  { pattern: /\/v1\/caregivers(\/|$)/, type: 'CAREGIVER' },
  { pattern: /\/v1\/elders(\/|$)/, type: 'ELDER' },
  { pattern: /\/v1\/devices(\/|$)/, type: 'DEVICE' },
  { pattern: /\/v1\/bindings(\/|$)/, type: 'DEVICE_BINDING' },
  { pattern: /\/v1\/events(\/|$)/, type: 'CARE_EVENT' },
  { pattern: /\/v1\/tasks(\/|$)/, type: 'CARE_TASK' },
  { pattern: /\/v1\/records(\/|$)/, type: 'CARE_RECORD' },
  { pattern: /\/v1\/handovers(\/|$)/, type: 'HANDOVER' },
  { pattern: /\/v1\/rules(\/|$)/, type: 'RULE_CONFIG' },
  { pattern: /\/v1\/simulator(\/|$)/, type: 'SIMULATOR' },
];

function resolveObjectType(url: string): string {
  for (const { pattern, type } of OBJECT_TYPE_ROUTES) {
    if (pattern.test(url)) return type;
  }
  return 'OTHER';
}

function resolveObjectId(url: string): string | null {
  const segments = url.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && /^\d+$/.test(last)) return last;
  return null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const url: string = request.url ?? '';
    const user: AuthUser | undefined = request.user;
    const objectType = resolveObjectType(url);
    if (objectType === 'OTHER' || url.includes('/v1/auth/')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (result) => {
          try {
            const relatedId =
              resolveObjectId(url) ??
              (result && typeof result === 'object' && 'id' in (result as Record<string, unknown>)
                ? String((result as Record<string, unknown>).id)
                : null);
            await this.auditRepo.save({
              orgId: user?.orgId ?? '0',
              operatorId: user?.userId ?? null,
              objectType,
              objectId: relatedId,
              action: method,
              summary: sanitizeForLog(request.body ?? {}),
              ip: request.ip ?? null,
            });
          } catch {
            // 审计失败不阻塞业务响应
          }
        },
      }),
    );
  }
}