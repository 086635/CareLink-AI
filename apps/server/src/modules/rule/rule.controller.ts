import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { RuleService } from './rule.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class UpdateRuleBody {
  @IsObject()
  ruleValue: Record<string, unknown>;
}

@Controller('v1/rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RuleController {
  constructor(private readonly ruleService: RuleService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.ruleService.listForOrg(user.orgId);
  }

  @Put(':id')
  @RequirePermissions('rule:manage')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateRuleBody,
  ) {
    return this.ruleService.update(id, user.orgId, body.ruleValue);
  }
}