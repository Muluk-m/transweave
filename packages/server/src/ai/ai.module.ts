import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';
import { AiController } from './ai.controller';
import { AiConfigController } from './ai-config.controller';
import { AiConnectorsController } from './ai-connectors.controller';
import { AiDefaultsController } from './ai-defaults.controller';
import { AiPromptTemplateController } from '../controller/ai-prompt-template.controller';
import { GlossaryService } from '../service/glossary.service';
import { GlossaryRepository } from '../repository/glossary.repository';
import { TranslationMemoryService } from '../service/translation-memory.service';
import { TranslationMemoryRepository } from '../repository/translation-memory.repository';
import { AiPromptTemplateService } from '../service/ai-prompt-template.service';
import { AiPromptTemplateRepository } from '../repository/ai-prompt-template.repository';
import { ConnectorResolver } from './connector-resolver.service';
import { AiConnectorMigrationService } from './ai-connector-migration.service';
import { AiConnectorRepository } from '../repository/ai-connector.repository';

@Module({
  controllers: [AiController, AiConfigController, AiConnectorsController, AiPromptTemplateController, AiDefaultsController],
  providers: [
    AiService,
    AiConfigService,
    GlossaryService,
    GlossaryRepository,
    TranslationMemoryService,
    TranslationMemoryRepository,
    AiPromptTemplateService,
    AiPromptTemplateRepository,
    ConnectorResolver,
    AiConnectorMigrationService,
    AiConnectorRepository,
  ],
  exports: [AiService, AiConfigService, AiPromptTemplateService, ConnectorResolver, AiConnectorRepository],
})
export class AiModule implements OnModuleInit {
  private readonly logger = new Logger(AiModule.name);
  constructor(private readonly migration: AiConnectorMigrationService) {}

  async onModuleInit() {
    try {
      await this.migration.runOnce();
    } catch (e) {
      this.logger.error('AI connector migration failed', e instanceof Error ? e.stack : e);
    }
  }
}
