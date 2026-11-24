import { z } from 'zod';
import { ElderStatus } from '../enums';

export interface ElderDto {
  id: string;
  orgId: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  age: number;
  bedLocationId: string | null;
  bedLabel: string | null;
  careLevel: number;
  mobility: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';
  careNotes: string | null;
  status: ElderStatus;
  createdAt: string;
}

export interface CreateElderRequest {
  name: string;
  gender: 'MALE' | 'FEMALE';
  age: number;
  bedLocationId: string;
  careLevel: number;
  mobility: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';
  careNotes?: string;
}

export interface UpdateElderRequest {
  name?: string;
  bedLocationId?: string | null;
  careLevel?: number;
  mobility?: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';
  careNotes?: string | null;
  status?: ElderStatus;
}

export interface ElderTimelineItem {
  kind: 'EVENT' | 'TASK' | 'RECORD';
  id: string;
  occurredAt: string;
  title: string;
  detail: string | null;
  relatedIds: {
    eventId?: string | null;
    taskId?: string | null;
    recordId?: string | null;
  };
}

export const createElderRequestSchema = z.object({
  name: z.string().min(1).max(64),
  gender: z.enum(['MALE', 'FEMALE']),
  age: z.number().int().min(0).max(150),
  bedLocationId: z.string().min(1),
  careLevel: z.number().int().min(1).max(3),
  mobility: z.enum(['BEDRIDDEN', 'LIMITED', 'MOBILE']),
  careNotes: z.string().max(500).optional(),
});

export const updateElderRequestSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  bedLocationId: z.string().nullable().optional(),
  careLevel: z.number().int().min(1).max(3).optional(),
  mobility: z.enum(['BEDRIDDEN', 'LIMITED', 'MOBILE']).optional(),
  careNotes: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(ElderStatus).optional(),
});