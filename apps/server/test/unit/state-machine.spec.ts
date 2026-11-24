import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CareEventEntity, CareTaskEntity, StatusTransitionLogEntity } from '../../src/infra/typeorm/entities';
import { EventStateMachineService } from '../../src/modules/event/state-machine.service';
import { TaskStateMachineService } from '../../src/modules/task/state-machine.service';

describe('双状态机转换规则（R011/R016/R020）', () => {
  let eventStateMachine: EventStateMachineService;
  let taskStateMachine: TaskStateMachineService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventStateMachineService,
        TaskStateMachineService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb: (em: unknown) => unknown) => cb({})),
            getRepository: jest.fn(() => ({ save: jest.fn() })),
          },
        },
        {
          provide: getRepositoryToken(CareEventEntity),
          useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(CareTaskEntity),
          useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(StatusTransitionLogEntity),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();
    eventStateMachine = moduleRef.get(EventStateMachineService);
    taskStateMachine = moduleRef.get(TaskStateMachineService);
  });

  describe('事件状态机（R011：无"待核查→已完成"路径）', () => {
    it('待核查 → 处理中 合法', () => {
      expect(() => eventStateMachine.assertTransition('PENDING_CHECK', 'PROCESSING')).not.toThrow();
    });

    it('待核查 → 误报关闭 合法', () => {
      expect(() => eventStateMachine.assertTransition('PENDING_CHECK', 'FALSE_ALARM_CLOSED')).not.toThrow();
    });

    it('待核查 → 已完成 非法（R011 结构性保证）', () => {
      expect(() => eventStateMachine.assertTransition('PENDING_CHECK', 'COMPLETED')).toThrow();
    });

    it('处理中 → 已完成 合法', () => {
      expect(() => eventStateMachine.assertTransition('PROCESSING', 'COMPLETED')).not.toThrow();
    });

    it('已完成为终态，任何转换非法', () => {
      expect(() => eventStateMachine.assertTransition('COMPLETED', 'PROCESSING')).toThrow();
      expect(() => eventStateMachine.assertTransition('COMPLETED', 'PENDING_CHECK')).toThrow();
    });

    it('误报关闭为终态，任何转换非法', () => {
      expect(() => eventStateMachine.assertTransition('FALSE_ALARM_CLOSED', 'PENDING_CHECK')).toThrow();
    });
  });

  describe('任务状态机（五态转换表）', () => {
    it('待分配 → 待认领/处理中/已取消 合法', () => {
      expect(() => taskStateMachine.assertTransition('UNASSIGNED', 'UNCLAIMED')).not.toThrow();
      expect(() => taskStateMachine.assertTransition('UNASSIGNED', 'PROCESSING')).not.toThrow();
      expect(() => taskStateMachine.assertTransition('UNASSIGNED', 'CANCELLED')).not.toThrow();
    });

    it('待认领 → 处理中/已取消 合法', () => {
      expect(() => taskStateMachine.assertTransition('UNCLAIMED', 'PROCESSING')).not.toThrow();
      expect(() => taskStateMachine.assertTransition('UNCLAIMED', 'CANCELLED')).not.toThrow();
    });

    it('处理中 → 已完成/已取消 合法', () => {
      expect(() => taskStateMachine.assertTransition('PROCESSING', 'COMPLETED')).not.toThrow();
      expect(() => taskStateMachine.assertTransition('PROCESSING', 'CANCELLED')).not.toThrow();
    });

    it('已完成/已取消为终态', () => {
      expect(() => taskStateMachine.assertTransition('COMPLETED', 'PROCESSING')).toThrow();
      expect(() => taskStateMachine.assertTransition('CANCELLED', 'PROCESSING')).toThrow();
    });

    it('待分配 → 已完成 非法（不可跳过执行直接完成）', () => {
      expect(() => taskStateMachine.assertTransition('UNASSIGNED', 'COMPLETED')).toThrow();
    });
  });

  describe('R020：误报/取消理由必填', () => {
    it('误报关闭缺少 reason 抛 4002', async () => {
      await expect(
        eventStateMachine.transition({
          eventId: '1',
          orgId: '1',
          toStatus: 'FALSE_ALARM_CLOSED',
          operatorId: '1',
          reason: '',
        }),
      ).rejects.toMatchObject({ code: 4002 });
    });

    it('取消任务缺少 reason 抛 5003', async () => {
      await expect(
        taskStateMachine.transition({
          taskId: '1',
          orgId: '1',
          toStatus: 'CANCELLED',
          operatorId: '1',
          reason: '  ',
        }),
      ).rejects.toMatchObject({ code: 5003 });
    });
  });
});