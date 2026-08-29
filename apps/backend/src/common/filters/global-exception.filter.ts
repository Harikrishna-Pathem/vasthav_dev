import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp ? exception.getResponse() : undefined;
    const message = typeof raw === 'object' && raw && 'message' in raw ? (Array.isArray(raw.message) ? 'Request validation failed' : String(raw.message)) : status === 500 ? 'An unexpected error occurred' : 'Request failed';
    response.status(status).json({ success: false, error: { code: status === 400 ? 'VALIDATION_ERROR' : HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR', message, requestId: request.id } });
  }
}
