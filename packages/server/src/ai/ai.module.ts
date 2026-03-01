import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';
import { AiController } from './ai.controller';
import { AiConfigController } from './ai-config.controller';

@Module({
  controllers: [AiController, AiConfigController],
  providers: [AiService, AiConfigService],
  exports: [AiService, AiConfigService],
})
export class AiModule {}
