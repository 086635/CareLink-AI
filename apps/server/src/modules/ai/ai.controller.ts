import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StatsEngineService } from './stats-engine.service';
import { HandoverSummaryService } from './handover-summary.service';
import { CareReportService } from './care-report.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class GenerateHandoverSummaryBody {
  @IsString()
  shiftFrom: string;

  @IsString()
  shiftTo: string;
}

export class GenerateReportBody {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  days: number = 14;
}

export class PatternQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  days: number = 14;
}

@Controller('v1/ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
  constructor(
    private readonly statsEngine: StatsEngineService,
    private readonly handoverSummaryService: HandoverSummaryService,
    private readonly careReportService: CareReportService,
  ) {}

  @Get('elders/:id/patterns')
  async patterns(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: PatternQuery) {
    return this.statsEngine.elderPatterns(user.orgId, id, query.days);
  }

  @Post('handover-summaries')
  @RequirePermissions('ai:invoke')
  async generateHandoverSummary(
    @CurrentUser() user: AuthUser,
    @Body() body: GenerateHandoverSummaryBody,
  ) {
    return this.handoverSummaryService.generate(
      user.orgId,
      user.userId,
      body.shiftFrom,
      body.shiftTo,
    );
  }

  @Post('elders/:id/reports')
  @RequirePermissions('ai:invoke')
  async generateElderReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: GenerateReportBody,
  ) {
    return this.careReportService.generateElderReport(user.orgId, id, user.userId, body.days);
  }

  @Get('elders/:id/suggestions')
  async suggestions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: PatternQuery,
  ) {
    return this.careReportService.suggestions(user.orgId, id, query.days);
  }

  @Get('reports/:id')
  async report(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.careReportService.findReport(id, user.orgId);
  }
}