import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OrganizationEntity } from './entities/organization.entity.js';
import { CareLocationEntity } from './entities/care-location.entity.js';
import { CaregiverEntity } from './entities/caregiver.entity.js';
import { ElderEntity } from './entities/elder.entity.js';
import { DeviceEntity } from './entities/device.entity.js';
import { DeviceBindingEntity } from './entities/device-binding.entity.js';
import { CareCycleEntity } from './entities/care-cycle.entity.js';
import { SensorReadingEntity } from './entities/sensor-reading.entity.js';
import { CareEventEntity } from './entities/care-event.entity.js';
import { CareTaskEntity } from './entities/care-task.entity.js';
import { CareRecordEntity } from './entities/care-record.entity.js';
import { HandoverEntity } from './entities/handover.entity.js';
import { HandoverItemEntity } from './entities/handover-item.entity.js';
import { AiReportEntity } from './entities/ai-report.entity.js';
import { AuditLogEntity } from './entities/audit-log.entity.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { RuleConfigEntity } from './entities/rule-config.entity.js';
import { StatusTransitionLogEntity } from './entities/status-transition-log.entity.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

require('dotenv').config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  username: process.env.DATABASE_USER ?? 'carelink',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'carelink',
  entities: [
    OrganizationEntity,
    CareLocationEntity,
    CaregiverEntity,
    ElderEntity,
    DeviceEntity,
    DeviceBindingEntity,
    CareCycleEntity,
    SensorReadingEntity,
    CareEventEntity,
    CareTaskEntity,
    CareRecordEntity,
    HandoverEntity,
    HandoverItemEntity,
    AiReportEntity,
    AuditLogEntity,
    NotificationEntity,
    RuleConfigEntity,
    StatusTransitionLogEntity,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  charset: 'utf8mb4',
  synchronize: false,
  logging: false,
  namingStrategy: new SnakeNamingStrategy(),
});