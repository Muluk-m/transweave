# Phase 4: Local File Storage - Research

**Researched:** 2026-03-01
**Domain:** File upload (Multer), static file serving (@nestjs/serve-static), local disk storage
**Confidence:** HIGH

## Summary

Phase 4 replaces the external QiLiangJia CDN (`https://qlj-devhub-homepage.qiliangjia.one/api/uploads`) with local disk storage for file uploads and a built-in static file server for retrieval. The current implementation is entirely on the frontend (`packages/web/api/upload.ts`) -- it sends files directly to an external CDN and stores the returned Cloudflare R2 URLs in the token `screenshots` field. There is **no upload endpoint on the NestJS server at all** today.

This phase requires building three things: (1) a server-side upload endpoint using NestJS's built-in Multer integration via `@UseInterceptors(FileInterceptor(...))` with `diskStorage`, (2) a static file server using `@nestjs/serve-static` (or `express.static` configured in `main.ts`) to serve the uploads directory, and (3) updating the frontend `upload.ts` to POST to the local server instead of the external CDN, and updating `getImageUrl()` to construct local URLs.

**Primary recommendation:** Use NestJS's built-in Multer integration (`@nestjs/platform-express` already in dependencies) with `diskStorage` for uploads, and `@nestjs/serve-static` for serving files. Store files in a configurable `UPLOAD_DIR` (default `./uploads`). Generate unique filenames with UUID to prevent collisions. Store relative paths (not absolute URLs) in the database `screenshots` field.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILE-01 | File uploads stored on local disk (replacing external CDN) | Multer `diskStorage` with configurable destination directory. NestJS `@UseInterceptors(FileInterceptor(...))` provides this out of the box. Upload controller saves to `UPLOAD_DIR` env var path. |
| FILE-02 | Uploaded files served via built-in static file server | `@nestjs/serve-static` module configured with `rootPath` pointing to `UPLOAD_DIR`. Files accessible at `/uploads/:filename`. |
| FILE-03 | Screenshot/image attachment on translation tokens uses local storage | Frontend `uploadImage()` changed to POST to `/api/upload` on local server. `getImageUrl()` updated to resolve relative paths against `NEXT_PUBLIC_API_URL`. Token schema `screenshots` field stores relative paths like `/uploads/abc123.png`. |
| FILE-04 | Upload directory path configurable via environment variable | `UPLOAD_DIR` environment variable (default: `./uploads`). Server reads at startup and ensures directory exists. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/platform-express | 11.x (already installed) | Multer file upload integration | Built into NestJS Express platform. Provides `FileInterceptor`, `FilesInterceptor`, and `diskStorage`. Already a project dependency -- zero new installs for upload handling. |
| @nestjs/serve-static | 5.x | Serve uploaded files as static assets | Official NestJS module for static file serving. Wraps Express `serve-static` with NestJS module system. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| multer (via @nestjs/platform-express) | 1.4.x (transitive) | Multipart form data parsing | Automatically available through @nestjs/platform-express. Do NOT install separately. |
| uuid | 11.x (already installed) | Unique filename generation | Generate collision-free filenames for uploaded files. Already in project dependencies. |
| path (Node.js built-in) | N/A | Path manipulation | Construct file paths, extract extensions. |
| fs/promises (Node.js built-in) | N/A | Directory creation | Ensure upload directory exists at startup (`mkdir -p` equivalent). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nestjs/serve-static | Manual `express.static()` in main.ts | Simpler setup but bypasses NestJS module system. serve-static module is more idiomatic for NestJS and supports configuration via module options. |
| diskStorage (local) | MinIO / S3 | Adds container complexity. Local disk is simplest for self-hosted. S3/MinIO can be added as optional adapter in future. |
| UUID filenames | Timestamp + random | UUID v4 is standard, collision-proof, and already in project deps. Timestamp-based names leak upload timing. |

**Installation:**
```bash
# Only one new package needed
pnpm --filter server add @nestjs/serve-static
```

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── controller/
│   └── upload.controller.ts     # POST /api/upload (new)
├── service/
│   └── file-storage.service.ts  # File operations abstraction (new)
├── modules/
│   └── file-storage.module.ts   # ServeStaticModule + providers (new)
└── ...

uploads/                          # Default upload directory (gitignored)
├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.png
├── ...
```

### Pattern 1: Upload Controller with Multer FileInterceptor
**What:** NestJS provides `FileInterceptor` and `FilesInterceptor` decorators that automatically handle multipart form data via Multer. Combined with `diskStorage`, files are written to disk during request parsing -- before the controller method even executes.
**When to use:** All file upload endpoints.
**Example:**
```typescript
// Source: NestJS official docs (https://docs.nestjs.com/techniques/file-upload)
import {
  Controller, Post, UseInterceptors, UploadedFile, UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '../jwt/guard';
import { FileStorageService } from '../service/file-storage.service';

@Controller('api/upload')
export class UploadController {
  constructor(private fileStorage: FileStorageService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, process.env.UPLOAD_DIR || './uploads');
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}
```

### Pattern 2: ServeStaticModule for File Serving
**What:** `@nestjs/serve-static` configures Express's `serve-static` middleware to serve files from a directory. It integrates cleanly with NestJS's module system and can exclude API routes from static serving.
**When to use:** Serving uploaded files back to the browser without writing custom GET endpoints.
**Example:**
```typescript
// Source: NestJS official docs (https://docs.nestjs.com/recipes/serve-static)
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: resolve(process.env.UPLOAD_DIR || './uploads'),
      serveRoot: '/uploads',  // URL prefix
      serveStaticOptions: {
        index: false,         // Don't serve index.html
        fallthrough: false,   // Return 404 for missing files (not pass to next)
      },
    }),
  ],
})
export class FileStorageModule {}
```

### Pattern 3: FileStorageService for Directory Management
**What:** A service that manages the upload directory lifecycle -- ensuring it exists at startup, providing path resolution, and abstracting file operations for testability.
**When to use:** Application bootstrap and any code that needs to interact with the upload directory.
**Example:**
```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private uploadDir: string;

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
```

### Pattern 4: Frontend Upload Integration
**What:** The frontend `upload.ts` must be updated to POST files to the local NestJS server instead of the external CDN, and `getImageUrl()` must resolve relative paths against the API base URL.
**When to use:** All file upload and display operations in the frontend.
**Example:**
```typescript
// packages/web/api/upload.ts -- updated version
export async function uploadImage(file: File): Promise<UploadFile> {
  const formData = new FormData();
  formData.append('file', file); // 'file' matches FileInterceptor('file')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json(); // { url, name, size, type }
}

export function getImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url; // Already absolute (legacy CDN URLs)
  }
  // Relative path like /uploads/abc.png
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${apiUrl}${url}`;
}
```

### Anti-Patterns to Avoid
- **Storing absolute URLs in the database:** Store `/uploads/filename.png` not `http://localhost:3001/uploads/filename.png`. The base URL changes between environments (dev, Docker, production behind reverse proxy).
- **Using original filenames:** Users upload `image.png` -- duplicates overwrite. Always generate unique names (UUID).
- **Nested upload directories by date/user:** Adds unnecessary complexity. A flat directory with UUID filenames is simpler and scales to hundreds of thousands of files.
- **Reading entire file into memory before writing:** Multer `diskStorage` streams directly to disk. Do NOT use `memoryStorage` and then `fs.writeFile`.
- **Serving uploads through a custom controller GET route:** Use `serve-static` middleware. A custom controller adds overhead and reimplements what Express already does efficiently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart form parsing | Custom body parser | Multer via `@nestjs/platform-express` | Multipart parsing has edge cases (boundary detection, encoding, streaming). Multer handles them all. |
| Static file serving | Custom GET controller that reads files | `@nestjs/serve-static` / `express.static` | Express's static middleware handles ETags, caching headers, Range requests, Content-Type detection, and 304 Not Modified automatically. |
| Unique filename generation | Timestamp + counter | `uuid.v4()` | UUID v4 is collision-proof without coordination. Counters require state; timestamps can collide under concurrent uploads. |
| MIME type validation | Custom magic-number checking | Multer `fileFilter` with mime check | For basic image validation, checking `file.mimetype` (set by the browser) is sufficient. For security-critical apps, add `file-type` library for magic-number validation -- but that's overkill here. |

**Key insight:** The entire server-side file storage feature can be built with zero custom I/O code. Multer writes files, express.static serves them. The only custom code is configuration and the thin controller layer.

## Common Pitfalls

### Pitfall 1: Upload Directory Not Existing at Startup
**What goes wrong:** Server starts, first upload fails with `ENOENT` error because the `./uploads` directory doesn't exist.
**Why it happens:** `diskStorage` does not create directories. It assumes the destination exists.
**How to avoid:** Use `OnModuleInit` lifecycle hook in `FileStorageService` to `mkdir({ recursive: true })` the upload directory before any requests are handled.
**Warning signs:** First upload after fresh clone or Docker rebuild fails with filesystem error.

### Pitfall 2: Multer Field Name Mismatch
**What goes wrong:** Upload request succeeds (200) but `@UploadedFile()` is undefined. No file is saved.
**Why it happens:** `FileInterceptor('file')` expects `FormData.append('file', ...)` on the frontend. If the frontend sends `files` (plural) or any other field name, Multer silently ignores it.
**How to avoid:** Ensure the FormData field name in the frontend exactly matches the string in `FileInterceptor()`. The current frontend uses `formData.append('files', file)` -- this must change to `formData.append('file', file)` to match.
**Warning signs:** Upload returns success but no file appears on disk.

### Pitfall 3: ServeStaticModule Intercepting API Routes
**What goes wrong:** API routes like `/api/upload` return 404 or serve static content instead of reaching the controller.
**Why it happens:** `ServeStaticModule` is configured with `serveRoot: '/'` or no root, causing it to intercept all requests before the NestJS router.
**How to avoid:** Always set `serveRoot: '/uploads'` so static serving only applies to the `/uploads/*` path prefix. Set `index: false` to prevent directory listing. Set `fallthrough: false` so missing files return 404 immediately rather than passing to the next handler.
**Warning signs:** API endpoints that worked before suddenly return unexpected responses.

### Pitfall 4: Docker Volume Mount Overwrites
**What goes wrong:** Files uploaded during development disappear when Docker container restarts.
**Why it happens:** Docker volume not mapped, or mapped to wrong path inside container.
**How to avoid:** In `docker-compose.yml`, map a named volume to the upload directory: `uploads:/app/uploads`. Ensure `UPLOAD_DIR` inside the container matches the volume mount path. This is a Phase 9 concern but the design must accommodate it.
**Warning signs:** Uploaded screenshots show broken image icons after container restart.

### Pitfall 5: Legacy CDN URLs Become Broken Images
**What goes wrong:** Existing tokens in the database have `screenshots` pointing to `https://qlj-devhub-homepage.qiliangjia.one/...` CDN URLs. After removing CDN dependency, these display as broken images.
**Why it happens:** Migration to local storage doesn't address existing data.
**How to avoid:** The `getImageUrl()` function already handles absolute URLs gracefully (returns them as-is). Legacy URLs will break naturally because the external CDN is being removed. For the open-source version (orphan branch), this is not a concern -- there's no existing data. For any migration from the internal version, a data migration script would need to re-download and re-upload images. This is out of scope for the open-source release.
**Warning signs:** N/A for open-source. Only relevant if migrating existing internal deployment.

## Code Examples

### Complete Upload Controller
```typescript
// packages/server/src/controller/upload.controller.ts
import {
  Controller, Post, UseInterceptors, UploadedFile, UploadedFiles,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '../jwt/guard';
import { FileStorageService } from '../service/file-storage.service';

const ALLOWED_MIME_TYPES = /^image\/(jpeg|png|gif|webp|svg\+xml)$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function createStorageConfig(fileStorageService: FileStorageService) {
  return diskStorage({
    destination: (req, file, cb) => {
      cb(null, fileStorageService.getUploadDir());
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
}

@Controller('api/upload')
export class UploadController {
  constructor(private fileStorage: FileStorageService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.test(file.mimetype)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return {
      url: this.fileStorage.getFileUrl(file.filename),
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}
```

**Note on storage config:** The `diskStorage` config in `@UseInterceptors` is resolved at module load time, not request time. To use `FileStorageService` for the destination path, either:
1. Use `process.env.UPLOAD_DIR` directly in the decorator (simpler, recommended)
2. Create a custom Multer storage engine that injects the service (complex, unnecessary)

Option 1 is standard practice and sufficient.

### FileStorageModule Configuration
```typescript
// packages/server/src/modules/file-storage.module.ts
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
```

### Updated Frontend upload.ts
```typescript
// packages/web/api/upload.ts
export interface UploadFile {
  name: string;
  size: number;
  type: string;
  url: string;  // Relative path: /uploads/uuid.ext
}

export async function uploadImage(file: File): Promise<UploadFile> {
  const formData = new FormData();
  formData.append('file', file);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

export async function uploadFiles(files: File[]): Promise<UploadFile[]> {
  // Upload files sequentially (simplest, avoids server overload)
  const results: UploadFile[] = [];
  for (const file of files) {
    results.push(await uploadImage(file));
  }
  return results;
}

export function getImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${apiUrl}${url}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External CDN (Cloudflare R2 via qiliangjia.one) | Local disk + serve-static | This phase | No external dependencies for file storage |
| Frontend uploads directly to CDN | Frontend uploads to NestJS backend | This phase | Upload flow goes through backend auth |
| Absolute CDN URLs in database | Relative paths (/uploads/...) | This phase | Environment-agnostic URLs |

## Open Questions

1. **File cleanup / orphan files**
   - What we know: If a user uploads a screenshot then removes it from the token, the file remains on disk.
   - What's unclear: Whether to implement cleanup (cron job, reference counting) or accept disk accumulation.
   - Recommendation: Accept accumulation for v1. Disk is cheap. Cleanup adds complexity. Document as known limitation. Can add `DELETE /api/upload/:filename` endpoint later if needed.

2. **Upload size limits**
   - What we know: 10MB per file is standard for image uploads. NestJS body parser default is 100KB (does not apply to Multer which handles its own parsing).
   - What's unclear: Whether users will want to upload non-image files (PDFs, documents) as context for translations.
   - Recommendation: Start with images only (MIME type filter). Expand to other file types in future phases if requested. 10MB limit is generous for screenshots.

## Sources

### Primary (HIGH confidence)
- NestJS Official Docs - File Upload: https://docs.nestjs.com/techniques/file-upload -- FileInterceptor, diskStorage, file validation
- NestJS Official Docs - Serve Static: https://docs.nestjs.com/recipes/serve-static -- ServeStaticModule configuration
- Codebase inspection -- `packages/web/api/upload.ts` (current CDN upload), `packages/server/src/models/schemas/token.schema.ts` (screenshots field), `packages/server/package.json` (@nestjs/platform-express already present)

### Secondary (MEDIUM confidence)
- Stack research STACK.md -- @nestjs/serve-static 5.x and Multer integration identified as recommended stack
- Project research SUMMARY.md -- File storage architecture (Pattern 3) and CDN replacement strategy

### Tertiary (LOW confidence)
- None. This domain is well-understood with official documentation covering all patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - NestJS official docs cover Multer and serve-static extensively. Both are first-party supported modules.
- Architecture: HIGH - Pattern is straightforward: upload controller + static serving + directory management. No ambiguity.
- Pitfalls: HIGH - Pitfalls identified from codebase inspection (field name mismatch, missing directory) and common NestJS patterns.

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, unlikely to change)
