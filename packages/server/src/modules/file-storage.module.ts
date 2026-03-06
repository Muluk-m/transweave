import { Module } from '@nestjs/common';
import { FileStorageService } from '../service/file-storage.service';
import { UploadController } from '../controller/upload.controller';
import { FileController } from '../controller/file.controller';

@Module({
  controllers: [UploadController, FileController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
