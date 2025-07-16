import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  
  // 全局应用日志拦截器
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
