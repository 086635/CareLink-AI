import { CareEventType } from './enums';

export interface EventCreatedPayload {
  eventId: string;
  orgId: string;
  elderId: string | null;
  elderName: string | null;
  bedLabel: string | null;
  deviceId: string;
  deviceNo: string;
  eventType: CareEventType;
  triggeredAt: string;
  simulated: boolean;
}

export interface TaskAssignedPayload {
  taskId: string;
  orgId: string;
  ownerId: string | null;
  areaLocationId: string | null;
  elderName: string | null;
  bedLabel: string | null;
  deadline: string;
  timeoutFlag: boolean;
}

export interface TaskTimeoutPayload {
  taskId: string;
  orgId: string;
  ownerId: string | null;
  deadline: string;
}

export interface DeviceOfflinePayload {
  deviceId: string;
  orgId: string;
  deviceNo: string;
  elderId: string | null;
  lastSeenAt: string | null;
}

export interface DashboardRefreshPayload {
  orgId: string;
  inCareElders: number;
  onlineDevices: number;
  pendingTasks: number;
  timeoutTasks: number;
}

export interface ServerPushEvents {
  'event:created': EventCreatedPayload;
  'task:assigned': TaskAssignedPayload;
  'task:transferred': TaskAssignedPayload;
  'task:timeout': TaskTimeoutPayload;
  'device:offline': DeviceOfflinePayload;
  'device:warning': DeviceOfflinePayload;
  'dashboard:refresh': DashboardRefreshPayload;
}