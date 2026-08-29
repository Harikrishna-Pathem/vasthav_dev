import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    const request = context.switchToHttp().getRequest<{ id?: string }>();
    if (request.id) response.setHeader('x-request-id', request.id);
    return next.handle();
  }
}
