import {
  Controller,
  Post,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { SeedService } from '../service/seed.service';

@Controller('api/seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('reset')
  async resetAndSeed(@Body() body: { secret?: string }) {
    const resetSecret = process.env.DEMO_RESET_SECRET;
    if (!resetSecret) {
      throw new ForbiddenException('Demo reset is not enabled');
    }
    if (body.secret !== resetSecret) {
      throw new ForbiddenException('Invalid reset secret');
    }

    await this.seedService.resetAndSeed();
    return { success: true, message: 'Database reset and seeded with demo data' };
  }
}
