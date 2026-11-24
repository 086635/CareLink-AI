import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CheckResult } from '@carelink/shared-types';
import {
  CareCycleEntity,
  CareEventEntity,
  CareRecordEntity,
  CareTaskEntity,
} from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';
import { EventStateMachineService } from '../event/state-machine.service';
import { TaskStateMachineService } from '../task/state-machine.service';

export interface QuickChangeInput {
  taskId: string;
  orgId: string;
  executorId: string;
  checkResult: CheckResult;
  careResult?: 'CHANGED' | 'NEED_FURTHER';
  skinAbnormal?: boolean;
  note?: string;
}

export interface QuickChangeOutput {
  recordId: string;
  taskId: string;
  eventId: string | null;
  taskStatus: string;
  eventStatus: string | null;
}

@Injectable()
export class QuickChangeService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CareRecordEntity)
    private readonly recordRepo: Repository<CareRecordEntity>,
    private readonly eventStateMachine: EventStateMachineService,
    private readonly taskStateMachine: TaskStateMachineService,
  ) {}

  /**
   * 单请求单数据库事务完成 5 步闭环（AC05 / R012 / R017 / NFR-006）：
   * ① 创建 CareRecord → ② 四向关联自动补全 → ③ 任务完成 → ④ 事件完成 → ⑤ 护理周期切换
   */
  async execute(input: QuickChangeInput): Promise<QuickChangeOutput> {
    const { checkResult } = input;
    if (checkResult == null) {
      throw BusinessException.badRequest('检查结果必填');
    }
    if (checkResult === CheckResult.CONFIRMED_MOISTURE && input.careResult == null) {
      throw new BusinessException(5002, '已确认尿湿时必须提供护理操作结果（R017）');
    }

    return this.dataSource.transaction(async (em) => {
      const task = await em.findOne(CareTaskEntity, {
        where: { id: input.taskId, orgId: input.orgId },
      });
      if (!task) {
        throw BusinessException.scopeDenied('无权访问该任务');
      }
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
        throw new BusinessException(4001, '任务已结束，不可重复登记');
      }

      // ② 四向关联由任务上下文推导，不由前端传入（FR-REC-004）
      const event = task.sourceEventId
        ? await em.findOne(CareEventEntity, { where: { id: task.sourceEventId } })
        : null;
      const elderId = task.elderId;
      if (elderId == null) {
        throw BusinessException.badRequest('任务未关联老人');
      }
      const deviceId = event?.deviceId ?? null;

      // ① 创建 CareRecord
      const record = em.create(CareRecordEntity, {
        orgId: input.orgId,
        taskId: task.id,
        eventId: event?.id ?? null,
        elderId,
        deviceId,
        executorId: input.executorId,
        executedAt: new Date(),
        checkResult,
        careResult: input.careResult ?? null,
        skinAbnormal: input.skinAbnormal ?? null,
        note: input.note ?? null,
        simulated: task.simulated,
      });
      const savedRecord = await em.save(record);

      let taskStatus: string;
      let eventStatus: string | null = null;

      if (checkResult === CheckResult.FALSE_ALARM) {
        // 误报路径：任务取消 + 事件误报关闭（理由同源，R011/R020）
        const reason = input.note?.trim() ? input.note.trim() : '现场检查确认为设备误报';
        await this.taskStateMachine.transition({
          taskId: task.id,
          orgId: input.orgId,
          toStatus: 'CANCELLED',
          operatorId: input.executorId,
          reason: `误报：${reason}`,
        });
        taskStatus = 'CANCELLED';
        if (event) {
          await this.eventStateMachine.transition({
            eventId: event.id,
            orgId: input.orgId,
            toStatus: 'FALSE_ALARM_CLOSED',
            operatorId: input.executorId,
            reason,
          });
          eventStatus = 'FALSE_ALARM_CLOSED';
        }
      } else {
        // ③ 任务 PROCESSING→COMPLETED（存在实际处理结果，R017）
        await this.taskStateMachine.transition({
          taskId: task.id,
          orgId: input.orgId,
          toStatus: 'COMPLETED',
          operatorId: input.executorId,
          reason: `检查结果：${checkResult}`,
        });
        taskStatus = 'COMPLETED';

        // ④ 关联事件完成（事件可能为待核查或处理中）
        if (event && event.status !== 'COMPLETED' && event.status !== 'FALSE_ALARM_CLOSED') {
          if (event.status === 'PENDING_CHECK') {
            await this.eventStateMachine.transition({
              eventId: event.id,
              orgId: input.orgId,
              toStatus: 'PROCESSING',
              operatorId: input.executorId,
            });
          }
          await this.eventStateMachine.transition({
            eventId: event.id,
            orgId: input.orgId,
            toStatus: 'COMPLETED',
            operatorId: input.executorId,
            reason: `护理完成：${checkResult}`,
          });
          eventStatus = 'COMPLETED';
        } else if (event) {
          eventStatus = event.status;
        }

        // ⑤ R012：更换纸尿裤后关闭旧周期+建立新周期
        if (deviceId && input.careResult === 'CHANGED') {
          await em.update(
            CareCycleEntity,
            { deviceId, elderId, status: 'ACTIVE' },
            { status: 'CLOSED', endedAt: new Date() },
          );
          const newCycle = em.create(CareCycleEntity, {
            elderId,
            deviceId,
            startedAt: new Date(),
            status: 'ACTIVE',
          });
          await em.save(newCycle);
        }
      }

      return {
        recordId: savedRecord.id,
        taskId: task.id,
        eventId: event?.id ?? null,
        taskStatus,
        eventStatus,
      };
    });
  }
}