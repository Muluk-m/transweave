import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../jwt/guard';
import { FileStorageService } from '../service/file-storage.service';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

@Controller('api/upload')
export class UploadController {
  constructor(private fileStorage: FileStorageService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const result = await this.fileStorage.storeFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
      user.userId,
    );
    return {
      url: result.url,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}
