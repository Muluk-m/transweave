import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { AuthGuard } from '../jwt/guard';

@Controller('api/ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('translate')
  async translate(
    @Body()
    data: {
      text: string;
      from: string;
      to: string[];
      projectId: string;
    },
  ) {
    const result = await this.aiService.translate(data);

    if (!result) {
      throw new HttpException(
        'Failed to translate',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result;
  }

  @Post('batch-translate')
  async batchTranslate(
    @Body()
    data: {
      tokens: Array<{ id: string; text: string; from: string; to: string[] }>;
      projectId: string;
    },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const event of this.aiService.batchTranslate(data)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : String(err) })}\n\n`,
      );
    }

    res.end();
  }

  @Post('tone-adjust')
  async toneAdjust(
    @Body()
    data: {
      projectId: string;
      currentTranslation: string;
      targetLang: string;
      tone: 'formal' | 'casual' | 'shorter' | 'rephrase' | 'polish' | 'custom';
      customInstruction?: string;
    },
  ) {
    if (!data.projectId || !data.currentTranslation || !data.targetLang || !data.tone) {
      throw new HttpException(
        'projectId, currentTranslation, targetLang and tone are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.aiService.adjustTone(data);
  }

  @Post('generate/key')
  async generateKey(
    @Body()
    data: {
      remark: string;
      tag?: string;
      module?: string;
      projectId: string;
    },
  ) {
    const result = await this.aiService.generateTokenKey(data);

    if (!result) {
      throw new HttpException(
        'Failed to generate key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result,
    };
  }
}
