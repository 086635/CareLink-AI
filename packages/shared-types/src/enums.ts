export enum CareEventStatus {
  PENDING_CHECK = 'PENDING_CHECK',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FALSE_ALARM_CLOSED = 'FALSE_ALARM_CLOSED',
}

export enum CareTaskStatus {
  UNASSIGNED = 'UNASSIGNED',
  UNCLAIMED = 'UNCLAIMED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  ADM = 'ADM',
  SUP = 'SUP',
  CG = 'CG',
}

export enum CareEventType {
  MOISTURE = 'MOISTURE',
  DEVICE_FAULT = 'DEVICE_FAULT',
}

export enum DeviceSource {
  REAL = 'REAL',
  SIMULATED = 'SIMULATED',
}

export enum CheckResult {
  CONFIRMED_MOISTURE = 'CONFIRMED_MOISTURE',
  NO_CHANGE_NEEDED = 'NO_CHANGE_NEEDED',
  FALSE_ALARM = 'FALSE_ALARM',
  NEED_FURTHER = 'NEED_FURTHER',
}

export enum CareResult {
  CHANGED = 'CHANGED',
  NEED_FURTHER = 'NEED_FURTHER',
}

export enum DeviceOnlineStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export enum OrgStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum BedStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
}

export enum ElderStatus {
  IN_CARE = 'IN_CARE',
  ARCHIVED = 'ARCHIVED',
}

export enum LocationLevel {
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
  ROOM = 'ROOM',
  BED = 'BED',
}

export enum CareCycleStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum ReadingQuality {
  NORMAL = 'NORMAL',
  INVALID = 'INVALID',
}

export enum CareTaskType {
  MOISTURE_CARE = 'MOISTURE_CARE',
  DEVICE_CHECK = 'DEVICE_CHECK',
  MANUAL_CHECK = 'MANUAL_CHECK',
}

export enum AiReportType {
  HANDOVER_SUMMARY = 'HANDOVER_SUMMARY',
  CARE_REPORT = 'CARE_REPORT',
  ANOMALY_HINT = 'ANOMALY_HINT',
}

export enum MonitorLevel {
  NORMAL = 'NORMAL',
  PENDING_CHECK = 'PENDING_CHECK',
  OFFLINE_UNKNOWN = 'OFFLINE_UNKNOWN',
}