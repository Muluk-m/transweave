import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { files, type FileRecord, type NewFileRecord } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class FileRepository extends BaseRepository<
  typeof files,
  FileRecord,
  NewFileRecord
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, files);
  }
}
