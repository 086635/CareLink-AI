import { z } from 'zod';
import { UserRole } from '../enums';

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  caregiver: {
    id: string;
    name: string;
    account: string;
    role: UserRole;
    orgId: string;
    orgName: string;
    onDuty: boolean;
  };
}

export interface MeResponse {
  id: string;
  name: string;
  account: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  onDuty: boolean;
}

export const loginRequestSchema = z.object({
  account: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  caregiver: z.object({
    id: z.string(),
    name: z.string(),
    account: z.string(),
    role: z.nativeEnum(UserRole),
    orgId: z.string(),
    orgName: z.string(),
    onDuty: z.boolean(),
  }),
});