import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
  ) {}

  async create(name: string, address?: string, contact?: string): Promise<OrganizationEntity> {
    const org = this.orgRepo.create({ name, address: address ?? null, contact: contact ?? null });
    try {
      return await this.orgRepo.save(org);
    } catch (err) {
      throw BusinessException.badRequest(`创建机构失败: ${(err as Error).message}`);
    }
  }

  async findById(id: string): Promise<OrganizationEntity> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw BusinessException.notFound('机构不存在');
    }
    return org;
  }

  async update(id: string, data: { name?: string; address?: string; contact?: string }): Promise<OrganizationEntity> {
    const org = await this.findById(id);
    if (data.name != null) org.name = data.name;
    if (data.address != null) org.address = data.address;
    if (data.contact != null) org.contact = data.contact;
    return this.orgRepo.save(org);
  }

  async updateStatus(id: string, status: 'ENABLED' | 'DISABLED'): Promise<OrganizationEntity> {
    const org = await this.findById(id);
    org.status = status;
    return this.orgRepo.save(org);
  }
}