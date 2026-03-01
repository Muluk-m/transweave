import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
  }

  async onModuleInit() {
    await mkdir(this.uploadDir, { recursive: true });
    this.logger.log(`Upload directory ready: ${this.uploadDir}`);
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
