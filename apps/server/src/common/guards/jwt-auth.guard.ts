import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusinessException } from '../errors/business.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: unknown, user: false | T): T {
    if (err || !user) {
      throw BusinessException.unauthenticated();
    }
    return user;
  }
}