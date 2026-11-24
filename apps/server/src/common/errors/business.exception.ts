import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@carelink/shared-types';

export class BusinessException extends HttpException {
  readonly code: number;

  constructor(code: number, message: string, httpStatus: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code, message }, httpStatus);
    this.code = code;
  }

  static unauthenticated(message = '未登录或会话已过期'): BusinessException {
    return new BusinessException(ERROR_CODES.UNAUTHENTICATED, message, HttpStatus.UNAUTHORIZED);
  }

  static sessionExpired(message = '会话已失效，请重新登录'): BusinessException {
    return new BusinessException(ERROR_CODES.SESSION_EXPIRED, message, HttpStatus.UNAUTHORIZED);
  }

  static permissionDenied(message = '无权限执行该操作'): BusinessException {
    return new BusinessException(ERROR_CODES.PERMISSION_DENIED, message, HttpStatus.FORBIDDEN);
  }

  static scopeDenied(message = '无权访问该数据范围'): BusinessException {
    return new BusinessException(ERROR_CODES.SCOPE_DENIED, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = '资源不存在'): BusinessException {
    return new BusinessException(ERROR_CODES.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }

  static badRequest(message = '请求参数错误'): BusinessException {
    return new BusinessException(ERROR_CODES.BAD_REQUEST, message, HttpStatus.BAD_REQUEST);
  }

  static validationFailed(message = '请求校验失败'): BusinessException {
    return new BusinessException(ERROR_CODES.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST);
  }
}