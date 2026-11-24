import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareLocationEntity, ElderEntity, OrganizationEntity } from '../../infra/typeorm/entities';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity, CareLocationEntity, ElderEntity])],
  controllers: [OrgController, LocationController],
  providers: [OrgService, LocationService],
  exports: [OrgService, LocationService],
})
export class OrgModule {}