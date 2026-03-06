import { Injectable, Logger } from '@nestjs/common';
import { FileRepository } from '../repository/file.repository';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(private readonly fileRepo: FileRepository) {}

  async storeFile(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    size: number,
    userId?: string,
  ): Promise<{ id: string; url: string }> {
    const record = await this.fileRepo.create({
      data: buffer.toString('base64'),
      filename,
      mimetype,
      size,
      userId: userId ?? null,
    });
    this.logger.log(`Stored file ${filename} (${size} bytes) as ${record.id}`);
    return { id: record.id, url: `/api/files/${record.id}` };
  }

  async getFile(
    id: string,
  ): Promise<{ data: Buffer; mimetype: string; size: number } | null> {
    const record = await this.fileRepo.findById(id);
    if (!record) return null;
    return {
      data: Buffer.from(record.data, 'base64'),
      mimetype: record.mimetype,
      size: record.size,
    };
  }

  getFileUrl(fileId: string): string {
    return `/api/files/${fileId}`;
  }
}
