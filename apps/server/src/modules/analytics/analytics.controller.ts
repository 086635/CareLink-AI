import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { AnalyticsService } from './analytics.service';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class SourceQuery {
  @IsOptional()
  @IsIn(['true', 'false'])
  simulated?: string;
}

@Controller('v1/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly statsService: StatsService,
  ) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    return this.analyticsService.dashboard(user.orgId);
  }

  @Get('events')
  @RequirePermissions('analytics:read')
  async eventStats(@CurrentUser() user: AuthUser, @Query() query: SourceQuery) {
    return this.statsService.eventStats(
      user.orgId,
      query.simulated === undefined ? undefined : query.simulated === 'true',
    );
  }

  @Get('response-time')
  @RequirePermissions('analytics:read')
  async responseTime(@CurrentUser() user: AuthUser, @Query() query: SourceQuery) {
    return this.statsService.responseTime(
      user.orgId,
      query.simulated === undefined ? undefined : query.simulated === 'true',
    );
  }

  @Get('completion-rate')
  @RequirePermissions('analytics:read')
  async completionRate(@CurrentUser() user: AuthUser, @Query() query: SourceQuery) {
    return this.statsService.completionRate(
      user.orgId,
      query.simulated === undefined ? undefined : query.simulated === 'true',
    );
  }
}