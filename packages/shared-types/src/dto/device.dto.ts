import { z } from 'zod';
import { DeviceOnlineStatus, DeviceSource, ReadingQuality } from '../enums';

export interface DeviceDto {
  id: string;
  orgId: string;
  deviceNo: string;
  deviceType: string;
  source: DeviceSource;
  onlineStatus: DeviceOnlineStatus;
  lastSeenAt: string | null;
  battery: number | null;
  status: 'ACTIVE' | 'RETIRED';
  boundElderId: string | null;
  boundElderName: string | null;
  deviceKey?: string;
}

export interface CreateDeviceRequest {
  deviceNo: string;
  deviceType: string;
  source: DeviceSource;
}

export interface DeviceBindingDto {
  id: string;
  deviceId: string;
  elderId: string;
  elderName: string;
  startedAt: string;
  endedAt: string | null;
  operatorName: string;
}

export interface CreateBindingRequest {
  elderId: string;
}

export interface DeviceReadingRequest {
  collectedAt: string;
  metricType: 'MOISTURE' | 'BATTERY' | 'HEARTBEAT';
  metricValue: number;
}

export interface DeviceReadingResponse {
  accepted: boolean;
  eventCreated: boolean;
  eventId: string | null;
}

export interface SensorReadingDto {
  id: string;
  deviceId: string;
  collectedAt: string;
  receivedAt: string;
  metricType: string;
  metricValue: number;
  quality: ReadingQuality;
  simulated: boolean;
}

export const createDeviceRequestSchema = z.object({
  deviceNo: z.string().min(1).max(64),
  deviceType: z.string().min(1).max(32),
  source: z.nativeEnum(DeviceSource),
});

export const createBindingRequestSchema = z.object({
  elderId: z.string().min(1),
});

export const deviceReadingRequestSchema = z.object({
  collectedAt: z.string().datetime(),
  metricType: z.enum(['MOISTURE', 'BATTERY', 'HEARTBEAT']),
  metricValue: z.number().min(-1000).max(100000),
});