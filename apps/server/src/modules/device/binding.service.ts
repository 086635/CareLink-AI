import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import {
  CareCycleEntity,
  DeviceBindingEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

@Injectable()
export class BindingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DeviceBindingEntity)
    private readonly bindingRepo: Repository<DeviceBindingEntity>,
  ) {}

  async bind(
    deviceId: string,
    orgId: string,
    elderId: string,
    operatorId: string,
  ): Promise<DeviceBindingEntity> {
    return this.dataSource.transaction(async (em) => {
      const device = await em.findOne(DeviceEntity, { where: { id: deviceId, orgId } });
      if (!device) {
        throw BusinessException.notFound('设备不存在');
      }
      if (device.status !== 'ACTIVE') {
        throw BusinessException.badRequest('设备已退役，不可绑定');
      }
      const elder = await em.findOne(ElderEntity, { where: { id: elderId, orgId } });
      if (!elder || elder.status !== 'IN_CARE') {
        throw BusinessException.badRequest('老人不存在或不在护');
      }
      const activeBinding = await em.findOne(DeviceBindingEntity, {
        where: { deviceId, activeKey: Not(IsNull()) },
      });
      if (activeBinding) {
        throw new BusinessException(3003, '该设备已绑定老人，同一时间只能绑定一位老人（R001）');
      }

      const binding = em.create(DeviceBindingEntity, {
        deviceId,
        elderId,
        startedAt: new Date(),
        endedAt: null,
        activeKey: null,
        operatorId,
      });
      const saved = await em.save(binding);
      saved.activeKey = saved.id;
      await em.update(DeviceBindingEntity, saved.id, { activeKey: saved.id });

      const cycle = em.create(CareCycleEntity, {
        elderId,
        deviceId,
        startedAt: new Date(),
        status: 'ACTIVE',
      });
      await em.save(cycle);

      return saved;
    });
  }

  async unbind(
    deviceId: string,
    orgId: string,
    bindingId: string,
  ): Promise<DeviceBindingEntity> {
    return this.dataSource.transaction(async (em) => {
      const binding = await em.findOne(DeviceBindingEntity, {
        where: { id: bindingId, deviceId },
      });
      if (!binding || binding.endedAt != null || binding.activeKey == null) {
        throw BusinessException.badRequest('绑定不存在或已解绑');
      }
      const device = await em.findOne(DeviceEntity, { where: { id: deviceId, orgId } });
      if (!device) {
        throw BusinessException.notFound('设备不存在');
      }
      binding.endedAt = new Date();
      binding.activeKey = null;
      const saved = await em.save(binding);

      await em.update(
        CareCycleEntity,
        { deviceId, elderId: binding.elderId, status: 'ACTIVE' },
        { status: 'CLOSED', endedAt: new Date() },
      );
      return saved;
    });
  }

  async activeBinding(deviceId: string): Promise<DeviceBindingEntity | null> {
    return this.bindingRepo.findOne({
      where: { deviceId, endedAt: IsNull() },
    });
  }

  async bindingHistory(deviceId: string, orgId: string): Promise<unknown[]> {
    const bindings = await this.bindingRepo.find({
      where: { deviceId },
      order: { startedAt: 'DESC' },
    });
    if (bindings.length === 0) return [];
    const device = await this.dataSource.getRepository(DeviceEntity).findOne({
      where: { id: deviceId, orgId },
    });
    if (!device) {
      throw BusinessException.notFound('设备不存在');
    }
    const elderIds = bindings.map((b) => b.elderId);
    const elders = await this.dataSource.getRepository(ElderEntity).findByIds(elderIds);
    const elderNameMap = new Map(elders.map((e) => [e.id, e.name]));
    return bindings.map((b) => ({
      id: b.id,
      deviceId: b.deviceId,
      elderId: b.elderId,
      elderName: elderNameMap.get(b.elderId) ?? null,
      startedAt: b.startedAt,
      endedAt: b.endedAt,
      active: b.endedAt == null,
    }));
  }
}