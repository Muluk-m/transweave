import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const logger = new Logger();

const SENSITIVE_FIELDS = ['password', 'newPassword', 'apiKey', 'token', 'key_hash', 'keyHash', 'secret'];

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

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
    if (request.body && Object.keys(request.body).length > 0) {
      logger.log(`[Request Body]`, sanitizeBody(request.body), requestId);
    }

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        logger.log(`[API Response] ${method} ${url} ${responseTime}ms`, requestId);
        logger.log(`[Response Status] ${response.statusCode}`, requestId);
      }),
    );
  }
}
