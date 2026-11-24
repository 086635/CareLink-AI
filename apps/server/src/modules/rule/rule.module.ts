import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleConfigEntity } from '../../infra/typeorm/entities';
import { RuleService } from './rule.service';
import { RuleController } from './rule.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RuleConfigEntity])],
  controllers: [RuleController],
  providers: [RuleService],
  exports: [RuleService],
})
export class RuleModule {}