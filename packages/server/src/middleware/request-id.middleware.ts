import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 优先使用客户端传来的 requestId（如果存在）
    const clientRequestId = req.headers['x-request-id'];
    const requestId = clientRequestId || uuidv4();

    // 将 requestId 添加到请求对象中，方便后续使用
    req['requestId'] = requestId;

    // 在响应头中添加 requestId
    res.setHeader('x-request-id', requestId);

    next();
  }
} 