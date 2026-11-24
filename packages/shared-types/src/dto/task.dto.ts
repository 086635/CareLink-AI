import { z } from 'zod';
import { CareTaskStatus, CareTaskType } from '../enums';

export interface CareTaskDto {
  id: string;
  orgId: string;
  taskType: CareTaskType;
  status: CareTaskStatus;
  sourceEventId: string | null;
  createdById: string | null;
  elderId: string | null;
  elderName: string | null;
  bedLabel: string | null;
  ownerId: string | null;
  ownerName: string | null;
  areaLocationId: string | null;
  areaName: string | null;
  priority: number;
  deadline: string;
  timeoutFlag: boolean;
  timeoutAt: string | null;
  cancelReason: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  simulated: boolean;
  createdAt: string;
}

export interface AssignTaskRequest {
  ownerId?: string;
  areaLocationId?: string;
}

export interface TransferTaskRequest {
  newOwnerId: string;
  reason: string;
}

export interface CancelTaskRequest {
  reason: string;
}

export interface CreateManualTaskRequest {
  elderId: string;
  taskType: CareTaskType;
  note?: string;
  ownerId?: string;
  areaLocationId?: string;
  deadlineMinutes?: number;
}

export const assignTaskRequestSchema = z
  .object({
    ownerId: z.string().optional(),
    areaLocationId: z.string().optional(),
  })
  .refine((v) => v.ownerId != null || v.areaLocationId != null, {
    message: 'ownerId 与 areaLocationId 至少提供一项',
  });

export const transferTaskRequestSchema = z.object({
  newOwnerId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export const cancelTaskRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const createManualTaskRequestSchema = z.object({
  elderId: z.string().min(1),
  taskType: z.nativeEnum(CareTaskType),
  note: z.string().max(500).optional(),
  ownerId: z.string().optional(),
  areaLocationId: z.string().optional(),
  deadlineMinutes: z.number().int().min(1).max(24 * 60).optional(),
});