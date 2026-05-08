import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';
import { AiController } from './ai.controller';
import { AiConfigController } from './ai-config.controller';
import { AiPromptTemplateController } from '../controller/ai-prompt-template.controller';
import { GlossaryService } from '../service/glossary.service';
import { GlossaryRepository } from '../repository/glossary.repository';
import { TranslationMemoryService } from '../service/translation-memory.service';
import { TranslationMemoryRepository } from '../repository/translation-memory.repository';
import { AiPromptTemplateService } from '../service/ai-prompt-template.service';
import { AiPromptTemplateRepository } from '../repository/ai-prompt-template.repository';

@Module({
  controllers: [AiController, AiConfigController, AiPromptTemplateController],
  providers: [
    AiService,
    AiConfigService,
    GlossaryService,
    GlossaryRepository,
    TranslationMemoryService,
    TranslationMemoryRepository,
    AiPromptTemplateService,
    AiPromptTemplateRepository,
  ],
  exports: [AiService, AiConfigService, AiPromptTemplateService],
})
export class AiModule {}
