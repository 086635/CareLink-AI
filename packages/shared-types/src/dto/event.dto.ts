import { z } from 'zod';
import { CareEventStatus, CareEventType } from '../enums';

export interface CareEventDto {
  id: string;
  orgId: string;
  eventType: CareEventType;
  status: CareEventStatus;
  elderId: string | null;
  elderName: string | null;
  bedLabel: string | null;
  deviceId: string;
  deviceNo: string;
  triggerEvidence: Record<string, unknown>;
  triggeredAt: string;
  lastSignalAt: string | null;
  signalCount: number;
  falseAlarmReason: string | null;
  simulated: boolean;
}

export interface FalseAlarmRequest {
  reason: string;
  taskId?: string;
}

export interface EventTransitionLogDto {
  id: string;
  fromStatus: CareEventStatus | null;
  toStatus: CareEventStatus;
  operatorName: string | null;
  reason: string | null;
  createdAt: string;
}

export const falseAlarmRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  taskId: z.string().optional(),
});