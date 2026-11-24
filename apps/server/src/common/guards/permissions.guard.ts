import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/auth-user';

export const PERMISSIONS: Record<string, string[]> = {
  'org:manage': ['ADM'],
  'location:manage': ['ADM'],
  'caregiver:manage': ['ADM'],
  'rule:manage': ['ADM'],
  'audit:read': ['ADM'],
  'analytics:read': ['ADM', 'SUP'],
  'task:assign': ['SUP', 'ADM'],
  'task:transfer': ['SUP', 'ADM'],
  'task:cancel': ['SUP', 'ADM'],
  'task:claim': ['CG', 'SUP', 'ADM'],
  'task:process': ['CG', 'SUP', 'ADM'],
  'elder:manage': ['ADM', 'SUP'],
  'device:manage': ['ADM', 'SUP'],
  'event:process': ['CG', 'SUP', 'ADM'],
  'handover:manage': ['CG', 'SUP', 'ADM'],
  'ai:invoke': ['SUP', 'ADM'],
  'record:read': ['CG', 'SUP', 'ADM'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user) {
      return false;
    }
    const allowedRoles = required.flatMap((p) => PERMISSIONS[p] ?? []);
    if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) {
      return true;
    }
    return false;
  }
}