import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileStorageService } from '../service/file-storage.service';

@Controller('api/files')
export class FileController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.fileStorage.getFile(id);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    res.set({
      'Content-Type': file.mimetype,
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(file.data);
  }
}
