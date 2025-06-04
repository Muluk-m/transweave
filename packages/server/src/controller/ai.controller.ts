import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from '../service/ai.service';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('translate')
  translate(@Body() data: { text: string; from: string; to: string[] }) {
    return this.aiService.translate(data);
  }
}
