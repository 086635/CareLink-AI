import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import * as entities from './infra/typeorm/entities';
import { AuditLogEntity } from './infra/typeorm/entities';
import { SnakeNamingStrategy } from './infra/typeorm/snake-naming.strategy';
import { RedisModule } from './infra/redis/redis.module';
import { HealthController } from './health.controller';
import { loadEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { OrgModule } from './modules/org/org.module';
import { CaregiverModule } from './modules/caregiver/caregiver.module';
import { ElderModule } from './modules/elder/elder.module';
import { DeviceModule } from './modules/device/device.module';
import { RuleModule } from './modules/rule/rule.module';
import { EventModule } from './modules/event/event.module';
import { NotificationModule } from './modules/notification/notification.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TaskModule } from './modules/task/task.module';
import { RecordModule } from './modules/record/record.module';
import { HandoverModule } from './modules/handover/handover.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 3306),
      username: process.env.DATABASE_USER ?? 'carelink',
      password: process.env.DATABASE_PASSWORD ?? '',
      database: process.env.DATABASE_NAME ?? 'carelink',
      entities: Object.values(entities),
      synchronize: false,
      charset: 'utf8mb4',
      timezone: 'Z',
      namingStrategy: new SnakeNamingStrategy(),
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AuditLogEntity]),
    RedisModule,
    AuthModule,
    AuditModule,
    OrgModule,
    CaregiverModule,
    ElderModule,
    DeviceModule,
    RuleModule,
    EventModule,
    NotificationModule,
    GatewayModule,
    AnalyticsModule,
    TaskModule,
    RecordModule,
    HandoverModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: 'ENV', useFactory: loadEnv },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}