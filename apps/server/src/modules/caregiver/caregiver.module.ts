import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareEventEntity,
  CareLocationEntity,
  CaregiverEntity,
  DeviceBindingEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { CaregiverService } from './caregiver.service';
import { CaregiverController } from './caregiver.controller';
import { EldersOverviewController } from './elders-overview.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CaregiverEntity,
      CareLocationEntity,
      ElderEntity,
      DeviceBindingEntity,
      DeviceEntity,
      CareEventEntity,
    ]),
    AuthModule,
  ],
  controllers: [CaregiverController, EldersOverviewController],
  providers: [CaregiverService],
  exports: [CaregiverService],
})
export class CaregiverModule {}