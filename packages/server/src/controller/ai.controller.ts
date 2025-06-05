import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AiService } from '../service/ai.service';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('translate')
  async translate(@Body() data: { text: string; from: string; to: string[] }) {
    const result = await this.aiService.translate(data);
    
    if (!result) { 
      throw new HttpException(
        'Failed to translate',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result;
  }
}
