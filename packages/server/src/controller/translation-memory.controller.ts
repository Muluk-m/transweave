import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { TranslationMemoryService } from '../service/translation-memory.service';

@Controller('api/tm')
export class TranslationMemoryController {
  constructor(private readonly tmService: TranslationMemoryService) {}

  @Get('suggestions')
  @UseGuards(AuthGuard)
  async getSuggestions(
    @Query('projectId') projectId: string,
    @Query('sourceText') sourceText: string,
    @Query('sourceLang') sourceLang: string,
    @Query('targetLang') targetLang: string,
  ) {
    return this.tmService.querySuggestions({
      projectId,
      sourceText,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });
  }
}
