import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * GlobalExceptionFilter catches everything that reaches the top of the
 * request pipeline and turns it into a consistent, safe JSON response.
 *
 * Two things this buys us:
 * - Clients never see a raw Node/Postgres/TypeORM stack trace, which can
 *   leak internal details (table names, file paths, query fragments).
 * - Every unhandled error is logged server-side with enough context to
 *   debug it, even though the client only sees a generic message.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    if (!isHttpException || status >= 500) {
      // Full detail server-side only.
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: typeof message === 'string' ? message : (message as { message?: unknown }).message ?? message,
    });
  }
}
