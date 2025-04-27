import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

console.log(process.env.DATABASE_URL, 'DATABASE_URL');
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
