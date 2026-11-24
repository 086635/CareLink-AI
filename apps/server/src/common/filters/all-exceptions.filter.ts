import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ERROR_CODES } from '@carelink/shared-types';

interface EnvelopeBody {
  code: number;
  message: string;
  data: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: EnvelopeBody = {
      code: ERROR_CODES.INTERNAL,
      message: '服务器内部错误',
      data: null,
    };

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'code' in res && 'message' in res) {
        const r = res as { code: number; message: string | string[] };
        body = {
          code: r.code,
          message: Array.isArray(r.message) ? r.message.join('; ') : r.message,
          data: null,
        };
      } else {
        body = {
          code: ERROR_CODES.BAD_REQUEST,
          message: exception.message,
          data: null,
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(httpStatus).json(body);
  }
}