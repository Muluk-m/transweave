import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import {
  lintTranslation,
  type LintIssue,
} from '../lint/translation-lint';

@Controller('api/lint')
@UseGuards(AuthGuard)
export class LintController {
  /**
   * Lint a single translation pair. Used by the frontend for inline,
   * debounced feedback while typing. The server holds the authoritative rule
   * implementation so the same rules apply across all clients.
   */
  @Post('translation')
  lint(
    @Body()
    data: {
      sourceText: string;
      targetText: string;
      language: string;
      maxLength?: number;
    },
  ): { issues: LintIssue[] } {
    if (!data.sourceText || !data.targetText || !data.language) {
      throw new BadRequestException(
        'sourceText, targetText, and language are required',
      );
    }
    const issues = lintTranslation(
      data.sourceText,
      data.targetText,
      data.language,
      { maxLength: data.maxLength },
    );
    return { issues };
  }
}
