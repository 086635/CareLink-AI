import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { CaregiverEntity, OrganizationEntity } from '../../infra/typeorm/entities';
import { RedisService } from '../../infra/redis/redis.service';
import { BusinessException } from '../../common/errors/business.exception';
import type { AuthUser } from '../../common/auth/auth-user';

export interface LoginResult {
  accessToken: string;
  caregiver: {
    id: string;
    name: string;
    account: string;
    role: 'ADM' | 'SUP' | 'CG';
    orgId: string;
    orgName: string;
    onDuty: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(CaregiverEntity)
    private readonly caregiverRepo: Repository<CaregiverEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async login(account: string, password: string): Promise<LoginResult> {
    const caregiver = await this.caregiverRepo.findOne({ where: { account } });
    if (!caregiver) {
      throw BusinessException.unauthenticated('账号或密码错误');
    }
    const passwordOk = await bcrypt.compare(password, caregiver.passwordHash);
    if (!passwordOk) {
      throw BusinessException.unauthenticated('账号或密码错误');
    }
    if (caregiver.status !== 'ACTIVE') {
      throw BusinessException.permissionDenied('该账号已被停用');
    }
    const org = await this.orgRepo.findOne({ where: { id: caregiver.orgId } });
    if (!org || org.status !== 'ENABLED') {
      throw BusinessException.permissionDenied('所属机构已被停用');
    }

    const payload = {
      sub: caregiver.id,
      orgId: caregiver.orgId,
      role: caregiver.role,
      jti: randomUUID(),
      account: caregiver.account,
      name: caregiver.name,
    };
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '2h';
    const accessToken = this.jwtService.sign(payload);
    const ttlSeconds = this.parseExpiresIn(expiresIn);
    await this.redis.setSession(caregiver.id, payload.jti, ttlSeconds);

    return {
      accessToken,
      caregiver: {
        id: caregiver.id,
        name: caregiver.name,
        account: caregiver.account,
        role: caregiver.role,
        orgId: caregiver.orgId,
        orgName: org.name,
        onDuty: caregiver.onDuty,
      },
    };
  }

  async logout(user: AuthUser): Promise<void> {
    await this.redis.revokeSession(user.userId, user.jti);
  }

  async revokeAllSessions(caregiverId: string): Promise<void> {
    await this.redis.revokeAllSessions(caregiverId);
  }

  async me(user: AuthUser): Promise<{
    id: string;
    name: string;
    account: string;
    role: string;
    orgId: string;
    orgName: string;
    onDuty: boolean;
  }> {
    const caregiver = await this.caregiverRepo.findOne({ where: { id: user.userId } });
    if (!caregiver) {
      throw BusinessException.sessionExpired();
    }
    const org = await this.orgRepo.findOne({ where: { id: user.orgId } });
    return {
      id: caregiver.id,
      name: caregiver.name,
      account: caregiver.account,
      role: caregiver.role,
      orgId: caregiver.orgId,
      orgName: org?.name ?? '',
      onDuty: caregiver.onDuty,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return 2 * 60 * 60;
    }
    const value = Number(match[1]);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 2 * 60 * 60;
    }
  }
}