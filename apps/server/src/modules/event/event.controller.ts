import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareEventEntity, ElderEntity } from '../../infra/typeorm/entities';
import { FalseAlarmService } from './false-alarm.service';
import { EventStateMachineService } from './state-machine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class EventListQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export class FalseAlarmBody {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  taskId?: string;
}

@Controller('v1/events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventController {
  constructor(
    @InjectRepository(CareEventEntity)
    private readonly eventRepo: Repository<CareEventEntity>,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
    private readonly falseAlarmService: FalseAlarmService,
    private readonly eventStateMachine: EventStateMachineService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: EventListQuery) {
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.orgId = :orgId', { orgId: user.orgId })
      .orderBy('e.triggeredAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (query.status) {
      qb.andWhere('e.status IN (:...statuses)', { statuses: query.status.split(',') });
    } else {
      qb.andWhere('e.status IN (:...statuses)', {
        statuses: ['PENDING_CHECK', 'PROCESSING'],
      });
    }
    if (query.eventType) {
      qb.andWhere('e.eventType = :type', { type: query.eventType });
    }
    const [list, total] = await qb.getManyAndCount();
    const elderIds = list.map((e) => e.elderId).filter((id): id is string => id != null);
    const elders = elderIds.length > 0 ? await this.elderRepo.findByIds(elderIds) : [];
    const elderMap = new Map(elders.map((e) => [e.id, e.name]));
    return {
      list: list.map((e) => ({
        ...e,
        elderName: e.elderId ? elderMap.get(e.elderId) ?? null : null,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const event = await this.eventRepo.findOne({ where: { id, orgId: user.orgId } });
    if (!event) {
      return null;
    }
    const logs = await this.eventStateMachine.transitionLogs(id);
    const elder = event.elderId
      ? await this.elderRepo.findOne({ where: { id: event.elderId } })
      : null;
    // R010：触发依据、时间及关联设备完整可见
    return {
      ...event,
      elderName: elder?.name ?? null,
      transitionLogs: logs,
    };
  }

  @Post(':id/false-alarm')
  @RequirePermissions('event:process')
  async falseAlarm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: FalseAlarmBody,
  ) {
    return this.falseAlarmService.confirmFalseAlarm(
      id,
      user.orgId,
      user.userId,
      body.reason,
      body.taskId,
    );
  }
}