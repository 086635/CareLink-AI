import { z } from 'zod';
import { AiReportType } from '../enums';
import type { AiReportContent } from '../llm';

export interface AiReportDto {
  id: string;
  orgId: string;
  type: AiReportType;
  elderId: string | null;
  elderName: string | null;
  content: AiReportContent;
  dataRange: {
    from: string;
    to: string;
    sources: string[];
    description: string;
  };
  insufficientFlag: boolean;
  degradedFlag: boolean;
  source: 'AI';
  createdByName: string | null;
  createdAt: string;
}

export interface ElderPatternDto {
  elderId: string;
  days: number;
  insufficient: boolean;
  insufficientReason: string | null;
  confirmedEventCount: number;
  avgResponseMinutes: number | null;
  monitoringCoverageRate: number | null;
  hourlyDistribution: { slot: string; count: number }[];
  changeFrequency: {
    dailyAvg: number | null;
    intervalAvgHours: number | null;
  };
  baseline: {
    validDays: number;
    slots: { slot: string; mean: number; upper: number }[];
  } | null;
  anomalyHints: { date: string; description: string }[];
  offlineSpans: { from: string; to: string }[];
  suggestions: { timeSlot: string; basis: string }[];
}

export const generateHandoverSummaryRequestSchema = z.object({
  shiftFrom: z.string().datetime(),
  shiftTo: z.string().datetime(),
});

export const generateCareReportRequestSchema = z.object({
  days: z.number().int().min(1).max(90).optional(),
});