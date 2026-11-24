import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareEventEntity, CareTaskEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';
import { EventStateMachineService } from './state-machine.service';
import { TaskStateMachineService } from '../task/state-machine.service';

@Injectable()
export class FalseAlarmService {
  constructor(
    @InjectRepository(CareEventEntity)
    private readonly eventRepo: Repository<CareEventEntity>,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    private readonly eventStateMachine: EventStateMachineService,
    private readonly taskStateMachine: TaskStateMachineService,
  ) {}

  /**
   * AC06：确认误报 → 事件"误报关闭"并保留原因；关联有效任务同步取消且理由同源（R011/R020）。
   */
  async confirmFalseAlarm(
    eventId: string,
    orgId: string,
    operatorId: string,
    reason: string,
    taskId?: string,
  ): Promise<{ eventStatus: string; taskStatus: string | null }> {
    if (!reason || reason.trim() === '') {
      throw new BusinessException(4002, '误报必须填写原因（R020）');
    }
    const event = await this.eventRepo.findOne({ where: { id: eventId, orgId } });
    if (!event) {
      throw BusinessException.scopeDenied('无权访问该事件');
    }

    await this.eventStateMachine.transition({
      eventId,
      orgId,
      toStatus: 'FALSE_ALARM_CLOSED',
      operatorId,
      reason,
    });

    let taskStatus: string | null = null;
    let relatedTaskId = taskId;
    if (!relatedTaskId) {
      const task = await this.taskRepo.findOne({
        where: { sourceEventId: eventId, orgId },
        order: { createdAt: 'DESC' },
      });
      relatedTaskId = task?.id;
    }
    if (relatedTaskId) {
      const task = await this.taskRepo.findOne({ where: { id: relatedTaskId, orgId } });
      if (task && (task.status === 'UNASSIGNED' || task.status === 'UNCLAIMED' || task.status === 'PROCESSING')) {
        await this.taskStateMachine.transition({
          taskId: relatedTaskId,
          orgId,
          toStatus: 'CANCELLED',
          operatorId,
          reason: `事件误报：${reason}`,
        });
        taskStatus = 'CANCELLED';
      } else if (task) {
        taskStatus = task.status;
      }
    }

    return { eventStatus: 'FALSE_ALARM_CLOSED', taskStatus };
  }
}