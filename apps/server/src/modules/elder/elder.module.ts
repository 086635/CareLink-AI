import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareLocationEntity, ElderEntity } from '../../infra/typeorm/entities';
import { ElderService } from './elder.service';
import { ElderController } from './elder.controller';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [TypeOrmModule.forFeature([ElderEntity, CareLocationEntity]), OrgModule],
  controllers: [ElderController],
  providers: [ElderService],
  exports: [ElderService],
})
export class ElderModule {}