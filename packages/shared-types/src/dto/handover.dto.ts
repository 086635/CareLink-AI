import { z } from 'zod';

export interface HandoverDto {
  id: string;
  orgId: string;
  fromCaregiverId: string;
  fromCaregiverName: string;
  toCaregiverId: string;
  toCaregiverName: string;
  shiftFrom: string;
  shiftTo: string;
  handedOverAt: string;
  aiReportId: string | null;
  itemCount: number;
}

export interface HandoverItemDto {
  id: string;
  handoverId: string;
  taskId: string;
  taskTitle: string | null;
  ownerBefore: string | null;
  ownerAfter: string | null;
}

export interface CreateHandoverRequest {
  toCaregiverId: string;
  shiftFrom: string;
  shiftTo: string;
  taskIds: string[];
  aiReportId?: string;
}

export const createHandoverRequestSchema = z.object({
  toCaregiverId: z.string().min(1),
  shiftFrom: z.string().datetime(),
  shiftTo: z.string().datetime(),
  taskIds: z.array(z.string().min(1)).min(1),
  aiReportId: z.string().optional(),
});