import { Provider, Logger } from '@nestjs/common';
import { resolve, join } from 'node:path';

export const DRIZZLE = 'DRIZZLE';

function getMigrationsFolder(): string {
  // __dirname is dist/db in prod, src/db in dev (ts-node)
  const fromDirname = resolve(__dirname, 'migrations');
  // Fallback: relative to cwd (works in both dev and prod)
  const fromCwd = join(process.cwd(), 'src', 'db', 'migrations');
  const { existsSync } = require('node:fs');
  return existsSync(join(fromDirname, 'meta', '_journal.json'))
    ? fromDirname
    : fromCwd;
}

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: async () => {
    const logger = new Logger('DrizzleProvider');
    const databaseUrl = process.env.DATABASE_URL;
    const migrationsFolder = getMigrationsFolder();
    logger.log(`Migrations folder: ${migrationsFolder}`);

    if (
      databaseUrl?.startsWith('postgres://') ||
      databaseUrl?.startsWith('postgresql://')
    ) {
      logger.log('Using PostgreSQL database');
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const { migrate } = await import('drizzle-orm/postgres-js/migrator');
      // postgres is ESM-only; handle CJS interop where .default may be missing
      const pgModule = await import('postgres');
      const postgres = (pgModule as any).default ?? pgModule;
      const schema = await import('./schema');
      const migrationClient = postgres(databaseUrl, { max: 1 });
      const migrationDb = drizzle(migrationClient, { schema });
      await migrate(migrationDb, { migrationsFolder });
      await migrationClient.end();
      logger.log('Migrations applied');
      const client = postgres(databaseUrl, { max: 20 });
      return drizzle(client, { schema });
    }

    // Default: PGlite for zero-config development
    const dataDir = process.env.PGLITE_DATA_DIR || './data/pglite';
    logger.log(`Using PGlite database at ${dataDir}`);
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const { PGlite } = await import('@electric-sql/pglite');
    const schema = await import('./schema');
    const client = new PGlite(dataDir);
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    logger.log('PGlite migrations applied');
    return db;
  },
};
