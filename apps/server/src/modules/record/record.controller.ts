import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CheckResult } from '@carelink/shared-types';
import { QuickChangeService } from './quick-change.service';
import { RecordService } from './record.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class QuickChangeBody {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsIn([CheckResult.CONFIRMED_MOISTURE, CheckResult.NO_CHANGE_NEEDED, CheckResult.FALSE_ALARM, CheckResult.NEED_FURTHER])
  checkResult: CheckResult;

  @IsOptional()
  @IsIn(['CHANGED', 'NEED_FURTHER'])
  careResult?: 'CHANGED' | 'NEED_FURTHER';

  @IsOptional()
  skinAbnormal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RecordListQuery {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @IsString()
  executorId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

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

export class CreateAbnormalRecordBody {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsOptional()
  skinAbnormal?: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

@Controller('v1/records')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecordController {
  constructor(
    private readonly quickChangeService: QuickChangeService,
    private readonly recordService: RecordService,
  ) {}

  @Post('quick-change')
  @RequirePermissions('task:process')
  async quickChange(@CurrentUser() user: AuthUser, @Body() body: QuickChangeBody) {
    return this.quickChangeService.execute({
      taskId: body.taskId,
      orgId: user.orgId,
      executorId: user.userId,
      checkResult: body.checkResult,
      careResult: body.careResult,
      skinAbnormal: body.skinAbnormal,
      note: body.note,
    });
  }

  @Post('abnormal')
  @RequirePermissions('task:process')
  async createAbnormal(@CurrentUser() user: AuthUser, @Body() body: CreateAbnormalRecordBody) {
    return this.recordService.createAbnormalRecord(user.orgId, user.userId, body);
  }

  @Get()
  @RequirePermissions('record:read')
  async list(@CurrentUser() user: AuthUser, @Query() query: RecordListQuery) {
    return this.recordService.list(user.orgId, {
      elderId: query.elderId === 'me' ? undefined : query.elderId,
      executorId: query.executorId === 'me' ? user.userId : query.executorId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}