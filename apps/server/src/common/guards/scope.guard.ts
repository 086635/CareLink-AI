import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';

export const SCOPE_KEY = 'scope_check';

@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user) {
      return false;
    }
    request.scopeOrgId = user.orgId;
    return true;
  }
}