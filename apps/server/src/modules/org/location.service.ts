import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareLocationEntity, ElderEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

const LEVEL_ORDER: Record<string, number> = {
  BUILDING: 0,
  FLOOR: 1,
  ROOM: 2,
  BED: 3,
};

export interface LocationNode {
  id: string;
  parentId: string | null;
  level: string;
  name: string;
  bedStatus: string | null;
  currentElderId: string | null;
  currentElderName: string | null;
  children: LocationNode[];
}

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(CareLocationEntity)
    private readonly locationRepo: Repository<CareLocationEntity>,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
  ) {}

  async create(
    orgId: string,
    parentId: string,
    level: 'BUILDING' | 'FLOOR' | 'ROOM' | 'BED',
    name: string,
  ): Promise<CareLocationEntity> {
    const parent = await this.locationRepo.findOne({ where: { id: parentId, orgId } });
    if (!parent) {
      throw BusinessException.notFound('父节点不存在');
    }
    if (LEVEL_ORDER[level] !== LEVEL_ORDER[parent.level] + 1) {
      throw BusinessException.badRequest('层级不合法：楼栋→楼层→房间→床位逐级创建');
    }
    const entity = this.locationRepo.create({
      orgId,
      parentId,
      level,
      name,
      bedStatus: level === 'BED' ? 'FREE' : null,
    });
    try {
      return await this.locationRepo.save(entity);
    } catch (err) {
      throw BusinessException.badRequest(`创建失败（同级节点不可重名）: ${(err as Error).message}`);
    }
  }

  async createBuilding(orgId: string, name: string): Promise<CareLocationEntity> {
    const entity = this.locationRepo.create({ orgId, parentId: null, level: 'BUILDING', name });
    try {
      return await this.locationRepo.save(entity);
    } catch (err) {
      throw BusinessException.badRequest(`创建失败（同级节点不可重名）: ${(err as Error).message}`);
    }
  }

  async tree(orgId: string): Promise<LocationNode[]> {
    const all = await this.locationRepo.find({
      where: { orgId },
      order: { id: 'ASC' },
    });
    const elderIds = all.map((l) => l.currentElderId).filter((id): id is string => id != null);
    const elders = await this.elderRepo.findByIds(elderIds);
    const elderNameMap = new Map(elders.map((e) => [e.id, e.name]));

    const nodeMap = new Map<string, LocationNode>();
    for (const l of all) {
      nodeMap.set(l.id, {
        id: l.id,
        parentId: l.parentId,
        level: l.level,
        name: l.name,
        bedStatus: l.bedStatus,
        currentElderId: l.currentElderId,
        currentElderName: l.currentElderId ? elderNameMap.get(l.currentElderId) ?? null : null,
        children: [],
      });
    }
    const roots: LocationNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async updateName(id: string, orgId: string, name: string): Promise<CareLocationEntity> {
    const location = await this.locationRepo.findOne({ where: { id, orgId } });
    if (!location) {
      throw BusinessException.notFound('节点不存在');
    }
    location.name = name;
    try {
      return await this.locationRepo.save(location);
    } catch (err) {
      throw BusinessException.badRequest(`更新失败（同级节点不可重名）: ${(err as Error).message}`);
    }
  }

  async beds(
    orgId: string,
    status?: 'FREE' | 'OCCUPIED',
  ): Promise<{ id: string; label: string; bedStatus: string | null; elderId: string | null; elderName: string | null }[]> {
    const qb = this.locationRepo
      .createQueryBuilder('loc')
      .where('loc.orgId = :orgId', { orgId })
      .andWhere('loc.level = :level', { level: 'BED' });
    if (status) {
      qb.andWhere('loc.bedStatus = :status', { status });
    }
    const beds = await qb.orderBy('loc.id', 'ASC').getMany();
    const elderIds = beds.map((b) => b.currentElderId).filter((id): id is string => id != null);
    const elders = await this.elderRepo.findByIds(elderIds);
    const elderNameMap = new Map(elders.map((e) => [e.id, e.name]));
    return beds.map((b) => ({
      id: b.id,
      label: b.name,
      bedStatus: b.bedStatus,
      elderId: b.currentElderId,
      elderName: b.currentElderId ? elderNameMap.get(b.currentElderId) ?? null : null,
    }));
  }

  async labelPath(orgId: string, locationId: string): Promise<string> {
    const all = await this.locationRepo.find({ where: { orgId } });
    const map = new Map(all.map((l) => [l.id, l]));
    const parts: string[] = [];
    let current = map.get(locationId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? map.get(current.parentId) : undefined;
    }
    return parts.join(' / ');
  }
}