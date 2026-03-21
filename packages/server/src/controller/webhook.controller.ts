import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { WebhookService } from '../service/webhook.service';
import { randomBytes } from 'crypto';

@Controller('api/webhooks')
@UseGuards(AuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get(':projectId')
  async list(@Param('projectId') projectId: string) {
    const hooks = await this.webhookService.findByProject(projectId);
    // Mask secrets in response
    return hooks.map((h) => ({
      ...h,
      secret: h.secret.slice(0, 4) + '****',
    }));
  }

  @Post()
  async create(
    @Body() data: { projectId: string; url: string; events: string[] },
  ) {
    const secret = randomBytes(32).toString('hex');
    const webhook = await this.webhookService.create({
      projectId: data.projectId,
      url: data.url,
      secret,
      events: data.events,
    });
    return { ...webhook, secret }; // Return full secret only on creation
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      url?: string;
      events?: string[];
      active?: boolean;
    },
  ) {
    return this.webhookService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.webhookService.delete(id);
    return { success: true };
  }
}
