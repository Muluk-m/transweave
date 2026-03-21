import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';
import { AiController } from './ai.controller';
import { AiConfigController } from './ai-config.controller';
import { GlossaryService } from '../service/glossary.service';
import { GlossaryRepository } from '../repository/glossary.repository';
import { TranslationMemoryService } from '../service/translation-memory.service';
import { TranslationMemoryRepository } from '../repository/translation-memory.repository';

@Module({
  controllers: [AiController, AiConfigController],
  providers: [
    AiService,
    AiConfigService,
    GlossaryService,
    GlossaryRepository,
    TranslationMemoryService,
    TranslationMemoryRepository,
  ],
  exports: [AiService, AiConfigService],
})
export class AiModule {}
