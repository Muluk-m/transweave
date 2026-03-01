import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';
import { FileStorageService } from '../service/file-storage.service';
import { UploadController } from '../controller/upload.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: resolve(process.env.UPLOAD_DIR || './uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: false,
      },
    }),
  ],
  controllers: [UploadController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
