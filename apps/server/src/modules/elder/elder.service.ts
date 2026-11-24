import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { CareLocationEntity, ElderEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';
import { LocationService } from '../org/location.service';

@Injectable()
export class ElderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
    @InjectRepository(CareLocationEntity)
    private readonly locationRepo: Repository<CareLocationEntity>,
    private readonly locationService: LocationService,
  ) {}

  async create(
    orgId: string,
    data: {
      name: string;
      gender: 'MALE' | 'FEMALE';
      age: number;
      bedLocationId: string;
      careLevel: number;
      mobility: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';
      careNotes?: string;
    },
  ): Promise<ElderEntity> {
    return this.dataSource.transaction(async (em) => {
      const bed = await em.findOne(CareLocationEntity, {
        where: { id: data.bedLocationId, orgId },
      });
      if (!bed || bed.level !== 'BED') {
        throw BusinessException.badRequest('指定床位不存在');
      }
      if (bed.bedStatus === 'OCCUPIED' || bed.currentElderId != null) {
        throw new BusinessException(1003, '该床位已被占用');
      }
      const elder = em.create(ElderEntity, {
        orgId,
        name: data.name,
        gender: data.gender,
        age: data.age,
        bedLocationId: data.bedLocationId,
        careLevel: data.careLevel,
        mobility: data.mobility,
        careNotes: data.careNotes ?? null,
      });
      const saved = await em.save(elder);
      await em.update(CareLocationEntity, bed.id, {
        bedStatus: 'OCCUPIED',
        currentElderId: saved.id,
      });
      return saved;
    });
  }

  async list(orgId: string, keyword?: string): Promise<unknown[]> {
    const qb = this.elderRepo
      .createQueryBuilder('e')
      .where('e.orgId = :orgId', { orgId })
      .andWhere('e.status = :status', { status: 'IN_CARE' })
      .orderBy('e.id', 'ASC');
    if (keyword) {
      qb.andWhere('e.name LIKE :kw', { kw: `%${keyword}%` });
    }
    const elders = await qb.getMany();
    const bedIds = elders.map((e) => e.bedLocationId).filter((id): id is string => id != null);
    const beds = bedIds.length > 0 ? await this.locationRepo.findByIds(bedIds) : [];
    const bedMap = new Map(beds.map((b) => [b.id, b]));
    const labelCache = new Map<string, string>();
    for (const b of beds) {
      labelCache.set(b.id, await this.locationService.labelPath(orgId, b.id));
    }
    return elders.map((e) => ({
      id: e.id,
      orgId: e.orgId,
      name: e.name,
      gender: e.gender,
      age: e.age,
      bedLocationId: e.bedLocationId,
      bedLabel: e.bedLocationId ? labelCache.get(e.bedLocationId) ?? null : null,
      careLevel: e.careLevel,
      mobility: e.mobility,
      careNotes: e.careNotes,
      status: e.status,
      createdAt: e.createdAt,
    }));
  }

  async findById(id: string, orgId: string): Promise<ElderEntity> {
    const elder = await this.elderRepo.findOne({ where: { id, orgId } });
    if (!elder) {
      throw BusinessException.scopeDenied('无权访问该老人档案');
    }
    return elder;
  }

  async detail(id: string, orgId: string): Promise<Record<string, unknown>> {
    const elder = await this.findById(id, orgId);
    const bedLabel = elder.bedLocationId
      ? await this.locationService.labelPath(orgId, elder.bedLocationId)
      : null;
    return {
      id: elder.id,
      orgId: elder.orgId,
      name: elder.name,
      gender: elder.gender,
      age: elder.age,
      bedLocationId: elder.bedLocationId,
      bedLabel,
      careLevel: elder.careLevel,
      mobility: elder.mobility,
      careNotes: elder.careNotes,
      status: elder.status,
      createdAt: elder.createdAt,
    };
  }

  async update(
    id: string,
    orgId: string,
    data: {
      name?: string;
      bedLocationId?: string | null;
      careLevel?: number;
      mobility?: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';
      careNotes?: string | null;
      status?: 'IN_CARE' | 'ARCHIVED';
    },
  ): Promise<ElderEntity> {
    return this.dataSource.transaction(async (em) => {
      const elder = await em.findOne(ElderEntity, { where: { id, orgId } });
      if (!elder) {
        throw BusinessException.scopeDenied('无权访问该老人档案');
      }

      const bedChanged = data.bedLocationId !== undefined && data.bedLocationId !== elder.bedLocationId;
      const archiving = data.status === 'ARCHIVED' && elder.status !== 'ARCHIVED';

      if (bedChanged || archiving) {
        if (elder.bedLocationId != null) {
          await em.update(
            CareLocationEntity,
            { id: elder.bedLocationId },
            { bedStatus: 'FREE', currentElderId: null },
          );
        }
      }

      if (data.name != null) elder.name = data.name;
      if (data.careLevel != null) elder.careLevel = data.careLevel;
      if (data.mobility != null) elder.mobility = data.mobility;
      if (data.careNotes !== undefined) elder.careNotes = data.careNotes;
      if (data.status != null) elder.status = data.status;

      if (data.status !== 'ARCHIVED' && data.bedLocationId != null) {
        const bed = await em.findOne(CareLocationEntity, {
          where: { id: data.bedLocationId, orgId },
        });
        if (!bed || bed.level !== 'BED') {
          throw BusinessException.badRequest('指定床位不存在');
        }
        if (bed.currentElderId != null && bed.currentElderId !== id) {
          throw new BusinessException(1003, '该床位已被占用');
        }
        elder.bedLocationId = data.bedLocationId;
        await em.update(CareLocationEntity, bed.id, {
          bedStatus: 'OCCUPIED',
          currentElderId: id,
        });
      } else if (archiving || data.bedLocationId === null) {
        elder.bedLocationId = null;
      }

      return em.save(elder);
    });
  }

  async findByIds(orgId: string, ids: string[]): Promise<ElderEntity[]> {
    if (ids.length === 0) return [];
    return this.elderRepo.find({ where: { orgId, id: In(ids) } });
  }
}