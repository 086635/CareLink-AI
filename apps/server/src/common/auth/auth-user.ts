import { UserRole } from '@carelink/shared-types';

export interface AuthUser {
  userId: string;
  orgId: string;
  role: UserRole;
  jti: string;
  account: string;
  name: string;
}