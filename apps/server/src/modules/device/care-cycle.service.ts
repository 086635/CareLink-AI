import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CareCycleEntity, DeviceBindingEntity } from '../../infra/typeorm/entities';

@Injectable()
export class CareCycleService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CareCycleEntity)
    private readonly cycleRepo: Repository<CareCycleEntity>,
  ) {}

  async findActiveCycle(deviceId: string, elderId: string): Promise<CareCycleEntity | null> {
    return this.cycleRepo.findOne({
      where: { deviceId, elderId, status: 'ACTIVE' },
      order: { startedAt: 'DESC' },
    });
  }

  async findActiveCycleByDevice(deviceId: string): Promise<CareCycleEntity | null> {
    return this.cycleRepo.findOne({
      where: { deviceId, status: 'ACTIVE' },
      order: { startedAt: 'DESC' },
    });
  }

  async startCycle(elderId: string, deviceId: string): Promise<CareCycleEntity> {
    const cycle = this.cycleRepo.create({
      elderId,
      deviceId,
      startedAt: new Date(),
      status: 'ACTIVE',
    });
    return this.cycleRepo.save(cycle);
  }

  async closeAndStartNew(elderId: string, deviceId: string): Promise<CareCycleEntity> {
    return this.dataSource.transaction(async (em) => {
      await em.update(
        CareCycleEntity,
        { deviceId, elderId, status: 'ACTIVE' },
        { status: 'CLOSED', endedAt: new Date() },
      );
      const cycle = em.create(CareCycleEntity, {
        elderId,
        deviceId,
        startedAt: new Date(),
        status: 'ACTIVE',
      });
      return em.save(cycle);
    });
  }

  async closeCycles(deviceId: string, elderId: string): Promise<void> {
    await this.cycleRepo.update(
      { deviceId, elderId, status: 'ACTIVE' },
      { status: 'CLOSED', endedAt: new Date() },
    );
  }

  async activeBindingElder(deviceId: string): Promise<string | null> {
    const binding = await this.dataSource.getRepository(DeviceBindingEntity).findOne({
      where: { deviceId, endedAt: undefined },
    });
    return binding?.elderId ?? null;
  }
}