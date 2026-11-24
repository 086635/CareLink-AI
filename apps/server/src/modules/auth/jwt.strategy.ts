import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@carelink/shared-types';
import { RedisService } from '../../infra/redis/redis.service';
import { BusinessException } from '../../common/errors/business.exception';
import type { AuthUser } from '../../common/auth/auth-user';

interface JwtPayload {
  sub: string;
  orgId: string;
  role: 'ADM' | 'SUP' | 'CG';
  jti: string;
  account: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly redis: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const valid = await this.redis.hasSession(payload.sub, payload.jti);
    if (!valid) {
      throw new UnauthorizedException(
        BusinessException.sessionExpired(),
      );
    }
    return {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role as UserRole,
      jti: payload.jti,
      account: payload.account,
      name: payload.name,
    };
  }
}