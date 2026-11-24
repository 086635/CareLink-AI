import { z } from 'zod';
import { CareResult, CheckResult } from '../enums';

export interface CareRecordDto {
  id: string;
  orgId: string;
  taskId: string;
  eventId: string | null;
  elderId: string;
  elderName: string;
  deviceId: string | null;
  executorId: string;
  executorName: string;
  executedAt: string;
  checkResult: CheckResult;
  careResult: CareResult | null;
  skinAbnormal: boolean | null;
  note: string | null;
  simulated: boolean;
}

export interface QuickChangeRequest {
  taskId: string;
  checkResult: CheckResult;
  careResult?: CareResult;
  skinAbnormal?: boolean;
  note?: string;
}

export interface QuickChangeResponse {
  recordId: string;
  taskId: string;
  eventId: string | null;
  taskStatus: string;
  eventStatus: string | null;
}

export const quickChangeRequestSchema = z
  .object({
    taskId: z.string().min(1),
    checkResult: z.nativeEnum(CheckResult),
    careResult: z.nativeEnum(CareResult).optional(),
    skinAbnormal: z.boolean().optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => v.checkResult !== CheckResult.CONFIRMED_MOISTURE || v.careResult != null, {
    message: '已确认尿湿时必须提供护理操作结果',
  });