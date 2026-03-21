import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { GlossaryService } from '../service/glossary.service';
import { CreateGlossaryDto, UpdateGlossaryDto, ImportGlossaryDto } from '../dto/glossary.dto';

@Controller('api/glossary')
export class GlossaryController {
  constructor(private readonly glossaryService: GlossaryService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() data: CreateGlossaryDto, @CurrentUser() user: UserPayload) {
    return this.glossaryService.create({
      ...data,
      createdBy: user.userId,
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  async list(
    @Query('teamId') teamId?: string,
    @Query('projectId') projectId?: string,
    @Query('q') query?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.glossaryService.list({
      teamId,
      projectId,
      query,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 50,
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() data: UpdateGlossaryDto) {
    return this.glossaryService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async delete(@Param('id') id: string) {
    await this.glossaryService.delete(id);
    return { success: true };
  }

  @Get('resolve/:projectId')
  @UseGuards(AuthGuard)
  async resolve(@Param('projectId') projectId: string, @Query('teamId') teamId: string) {
    return this.glossaryService.resolveForProject(projectId, teamId);
  }

  @Get('export')
  @UseGuards(AuthGuard)
  async exportGlossary(
    @Query('teamId') teamId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.glossaryService.exportAll({ teamId, projectId });
  }

  @Post('import')
  @UseGuards(AuthGuard)
  async importGlossary(@Body() data: ImportGlossaryDto, @CurrentUser() user: UserPayload) {
    return this.glossaryService.bulkImport(data.entries, {
      teamId: data.teamId,
      projectId: data.projectId,
    }, user.userId);
  }
}
