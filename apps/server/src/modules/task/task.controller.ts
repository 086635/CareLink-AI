import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { TaskService } from './task.service';
import { TaskStateMachineService } from './state-machine.service';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessException } from '../../common/errors/business.exception';
import type { AuthUser } from '../../common/auth/auth-user';

export class TaskListQuery {
  @IsOptional()
  @IsIn(['me'])
  assignee?: string;

  @IsOptional()
  @IsString()
  status?: string;

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

export class CreateManualTaskBody {
  @IsString()
  @IsNotEmpty()
  elderId: string;

  @IsIn(['MOISTURE_CARE', 'DEVICE_CHECK', 'MANUAL_CHECK'])
  taskType: 'MOISTURE_CARE' | 'DEVICE_CHECK' | 'MANUAL_CHECK';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  areaLocationId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  deadlineMinutes?: number;
}

export class AssignTaskBody {
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  areaLocationId?: string;
}

export class TransferTaskBody {
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CancelTaskBody {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@Controller('v1/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly stateMachine: TaskStateMachineService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: TaskListQuery) {
    return this.taskService.list(user.orgId, {
      assignee: query.assignee === 'me' ? user.userId : undefined,
      status: query.status ? (query.status.split(',') as string[]) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Post()
  @RequirePermissions('task:assign')
  async createManual(@CurrentUser() user: AuthUser, @Body() body: CreateManualTaskBody) {
    return this.taskService.createManual(user.orgId, {
      ...body,
      createdById: user.userId,
    });
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.taskService.detail(id, user.orgId);
  }

  @Post(':id/claim')
  @RequirePermissions('task:claim')
  async claim(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stateMachine.claim(id, user.orgId, user.userId);
  }

  @Post(':id/assign')
  @RequirePermissions('task:assign')
  async assign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AssignTaskBody) {
    const task = await this.taskService.assign(id, user.orgId, body, user.userId);
    if (body.ownerId) {
      await this.notificationService.notifyTaskAssigned(
        {
          taskId: task.id,
          orgId: task.orgId,
          ownerId: task.ownerId,
          areaLocationId: task.areaLocationId,
          elderName: null,
          bedLabel: null,
          deadline: task.deadline.toISOString(),
          timeoutFlag: task.timeoutFlag,
        },
        [body.ownerId],
      );
    }
    return task;
  }

  @Post(':id/transfer')
  @RequirePermissions('task:transfer')
  async transfer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: TransferTaskBody) {
    const task = await this.taskService.transfer(id, user.orgId, body, user.userId);
    await this.notificationService.notifyTaskTransferred(
      {
        taskId: task.id,
        orgId: task.orgId,
        ownerId: task.ownerId,
        areaLocationId: task.areaLocationId,
        elderName: null,
        bedLabel: null,
        deadline: task.deadline.toISOString(),
        timeoutFlag: task.timeoutFlag,
      },
      body.newOwnerId,
    );
    return task;
  }

  @Post(':id/cancel')
  @RequirePermissions('task:cancel')
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CancelTaskBody) {
    if (!body.reason || body.reason.trim() === '') {
      throw new BusinessException(5003, '取消任务必须填写理由（R020）');
    }
    return this.taskService.cancel(id, user.orgId, body.reason, user.userId);
  }
}