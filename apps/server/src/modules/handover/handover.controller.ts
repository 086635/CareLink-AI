import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { HandoverService } from './handover.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class CreateHandoverBody {
  @IsString()
  @IsNotEmpty()
  toCaregiverId: string;

  @IsString()
  @IsNotEmpty()
  shiftFrom: string;

  @IsString()
  @IsNotEmpty()
  shiftTo: string;

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  taskIds: string[];

  @IsOptional()
  @IsString()
  aiReportId?: string;
}

export class HandoverListQuery {
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

@Controller('v1/handovers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HandoverController {
  constructor(private readonly handoverService: HandoverService) {}

  @Post()
  @RequirePermissions('handover:manage')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateHandoverBody) {
    return this.handoverService.create({
      orgId: user.orgId,
      fromCaregiverId: user.userId,
      toCaregiverId: body.toCaregiverId,
      shiftFrom: body.shiftFrom,
      shiftTo: body.shiftTo,
      taskIds: body.taskIds,
      aiReportId: body.aiReportId,
    });
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: HandoverListQuery) {
    return this.handoverService.list(user.orgId, query.page, query.pageSize);
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.handoverService.detail(id, user.orgId);
  }
}