import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { ApiKeyService } from '../service/api-key.service';

@Controller('api/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * POST /api/api-keys
   * Create a new API key. Returns the full key exactly once.
   */
  @Post()
  @UseGuards(AuthGuard)
  async createKey(
    @Body() data: { name: string; scopes?: string[]; expiresAt?: string },
    @CurrentUser() user: UserPayload,
  ) {
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;
    const result = await this.apiKeyService.createKey(
      user.userId,
      data.name,
      data.scopes,
      expiresAt,
    );
    return {
      success: true,
      apiKey: result,
    };
  }

  /**
   * GET /api/api-keys
   * List all API keys for the current user.
   */
  @Get()
  @UseGuards(AuthGuard)
  async listKeys(@CurrentUser() user: UserPayload) {
    return this.apiKeyService.listKeys(user.userId);
  }

  /**
   * DELETE /api/api-keys/:id
   * Revoke/delete an API key.
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteKey(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const deleted = await this.apiKeyService.deleteKey(id, user.userId);
    if (!deleted) {
      throw new NotFoundException('API key not found');
    }
    return { success: true };
  }
}
