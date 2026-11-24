import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CaregiverEntity, CareLocationEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';
import { AuthService } from '../auth/auth.service';
import { maskPhone } from '../../common/utils/masking.util';

@Injectable()
export class CaregiverService {
  constructor(
    @InjectRepository(CaregiverEntity)
    private readonly caregiverRepo: Repository<CaregiverEntity>,
    @InjectRepository(CareLocationEntity)
    private readonly locationRepo: Repository<CareLocationEntity>,
    private readonly authService: AuthService,
  ) {}

  async create(
    orgId: string,
    data: {
      name: string;
      phone: string;
      account: string;
      password: string;
      role: 'ADM' | 'SUP' | 'CG';
      areaLocationId?: string;
    },
  ): Promise<CaregiverEntity> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const entity = this.caregiverRepo.create({
      orgId,
      name: data.name,
      phone: data.phone,
      account: data.account,
      passwordHash,
      role: data.role,
      areaLocationId: data.areaLocationId ?? null,
    });
    try {
      return await this.caregiverRepo.save(entity);
    } catch (err) {
      throw BusinessException.badRequest(`创建失败（账号在本机构内不可重复）: ${(err as Error).message}`);
    }
  }

  async list(orgId: string): Promise<unknown[]> {
    const list = await this.caregiverRepo.find({ where: { orgId }, order: { id: 'ASC' } });
    const areaIds = list.map((c) => c.areaLocationId).filter((id): id is string => id != null);
    const areas = areaIds.length > 0 ? await this.locationRepo.findByIds(areaIds) : [];
    const areaNameMap = new Map(areas.map((a) => [a.id, a.name]));
    return list.map((c) => ({
      id: c.id,
      orgId: c.orgId,
      name: c.name,
      phone: maskPhone(c.phone),
      account: c.account,
      role: c.role,
      onDuty: c.onDuty,
      status: c.status,
      areaLocationId: c.areaLocationId,
      areaName: c.areaLocationId ? areaNameMap.get(c.areaLocationId) ?? null : null,
    }));
  }

  async update(
    id: string,
    orgId: string,
    data: { name?: string; phone?: string; role?: 'ADM' | 'SUP' | 'CG'; areaLocationId?: string | null; status?: 'ACTIVE' | 'DISABLED' },
  ): Promise<CaregiverEntity> {
    const caregiver = await this.caregiverRepo.findOne({ where: { id, orgId } });
    if (!caregiver) {
      throw BusinessException.notFound('人员不存在');
    }
    if (data.name != null) caregiver.name = data.name;
    if (data.phone != null) caregiver.phone = data.phone;
    if (data.role != null) caregiver.role = data.role;
    if (data.areaLocationId !== undefined) caregiver.areaLocationId = data.areaLocationId;
    if (data.status != null) {
      caregiver.status = data.status;
      if (data.status === 'DISABLED') {
        caregiver.onDuty = false;
        await this.authService.revokeAllSessions(id);
      }
    }
    return this.caregiverRepo.save(caregiver);
  }

  async toggleDuty(id: string, orgId: string, onDuty: boolean): Promise<CaregiverEntity> {
    const caregiver = await this.caregiverRepo.findOne({ where: { id, orgId } });
    if (!caregiver) {
      throw BusinessException.notFound('人员不存在');
    }
    if (caregiver.status === 'DISABLED' && onDuty) {
      throw BusinessException.badRequest('人员已被停用，不可上岗');
    }
    caregiver.onDuty = onDuty;
    if (!onDuty) {
      await this.authService.revokeAllSessions(id);
    }
    return this.caregiverRepo.save(caregiver);
  }

  async assertOnDuty(caregiverId: string): Promise<void> {
    const caregiver = await this.caregiverRepo.findOne({ where: { id: caregiverId } });
    if (!caregiver || !caregiver.onDuty || caregiver.status !== 'ACTIVE') {
      throw new BusinessException(5004, '该人员已离岗或停用，不可分配任务');
    }
  }

  async findByIds(orgId: string, ids: string[]): Promise<CaregiverEntity[]> {
    if (ids.length === 0) return [];
    return this.caregiverRepo.find({ where: { orgId, id: In(ids) } });
  }

  async findById(id: string): Promise<CaregiverEntity | null> {
    return this.caregiverRepo.findOne({ where: { id } });
  }
}