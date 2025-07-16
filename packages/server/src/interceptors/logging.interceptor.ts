import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const logger = new Logger();

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url;
    const requestId = request['requestId'];
    const now = Date.now();

    logger.log(`[API Request] ${method} ${url}`, requestId);
    if (request.body) {
      logger.log(`[Request Body]`, request.body,requestId);
    }

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        logger.log(`[API Response] ${method} ${url} ${responseTime}ms`,requestId);
        logger.log(`[Response Status] ${response.statusCode}`,requestId);
      }),
    );
  }
} 