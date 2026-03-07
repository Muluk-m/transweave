import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { AiConfigService } from './ai-config.service';
import type { AiConfigDto } from './providers/translation-provider.interface';
import { maskApiKey } from './encryption.util';

@Controller('api/ai/config')
@UseGuards(AuthGuard)
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get('status')
  async getConfigStatus(@Query('projectId') projectId: string) {
    return this.aiConfigService.getConfigStatus(projectId);
  }

  @Get('team/:teamId')
  async getTeamConfig(@Param('teamId') teamId: string) {
    const config = await this.aiConfigService.getTeamConfig(teamId);
    if (!config) {
      return { configured: false };
    }
    return {
      configured: true,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      keyHint: maskApiKey(config.apiKey),
    };
  }

  @Put('team/:teamId')
  async setTeamConfig(
    @Param('teamId') teamId: string,
    @Body() config: AiConfigDto,
  ) {
    await this.aiConfigService.setTeamConfig(teamId, config);
    return { success: true };
  }

  @Delete('team/:teamId')
  async removeTeamConfig(@Param('teamId') teamId: string) {
    await this.aiConfigService.removeTeamConfig(teamId);
    return { success: true };
  }

  @Get('project/:projectId')
  async getProjectConfig(@Param('projectId') projectId: string) {
    const config = await this.aiConfigService.getProjectConfig(projectId);
    if (!config) {
      return { configured: false };
    }
    return {
      configured: true,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      keyHint: maskApiKey(config.apiKey),
    };
  }

  @Put('project/:projectId')
  async setProjectConfig(
    @Param('projectId') projectId: string,
    @Body() config: AiConfigDto,
  ) {
    await this.aiConfigService.setProjectConfig(projectId, config);
    return { success: true };
  }

  @Delete('project/:projectId')
  async removeProjectConfig(@Param('projectId') projectId: string) {
    await this.aiConfigService.removeProjectConfig(projectId);
    return { success: true };
  }

  @Post('models')
  async listModels(
    @Body() body: { provider: string; apiKey: string; baseUrl?: string },
  ) {
    const models = await this.aiConfigService.listModels(
      body.provider,
      body.apiKey,
      body.baseUrl,
    );
    return { models };
  }
}
