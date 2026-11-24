import { z } from 'zod';
import { BedStatus, LocationLevel, OrgStatus, UserRole } from '../enums';

export interface OrgDto {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  status: OrgStatus;
  createdAt: string;
}

export interface CreateOrgRequest {
  name: string;
  address?: string;
  contact?: string;
}

export interface UpdateOrgRequest {
  name?: string;
  address?: string;
  contact?: string;
}

export interface LocationDto {
  id: string;
  orgId: string;
  parentId: string | null;
  level: LocationLevel;
  name: string;
  bedStatus: BedStatus | null;
  currentElderId: string | null;
  currentElderName: string | null;
}

export interface CreateLocationRequest {
  orgId?: string;
  parentId: string;
  level: LocationLevel;
  name: string;
}

export interface CaregiverDto {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  account: string;
  role: UserRole;
  onDuty: boolean;
  status: 'ACTIVE' | 'DISABLED';
  areaLocationId: string | null;
  areaName: string | null;
}

export interface CreateCaregiverRequest {
  name: string;
  phone: string;
  account: string;
  password: string;
  role: UserRole;
  areaLocationId?: string;
}

export interface UpdateCaregiverRequest {
  name?: string;
  phone?: string;
  role?: UserRole;
  areaLocationId?: string | null;
  status?: 'ACTIVE' | 'DISABLED';
}

export const createOrgRequestSchema = z.object({
  name: z.string().min(1).max(128),
  address: z.string().max(256).optional(),
  contact: z.string().max(64).optional(),
});

export const createLocationRequestSchema = z.object({
  parentId: z.string().min(1),
  level: z.nativeEnum(LocationLevel),
  name: z.string().min(1).max(64),
});

export const createCaregiverRequestSchema = z.object({
  name: z.string().min(1).max(64),
  phone: z.string().regex(/^1\d{10}$/),
  account: z.string().min(3).max(64),
  password: z.string().min(6).max(128),
  role: z.nativeEnum(UserRole),
  areaLocationId: z.string().optional(),
});