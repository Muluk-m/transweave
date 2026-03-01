import { Provider, Logger } from '@nestjs/common';

export const DRIZZLE = 'DRIZZLE';

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: async () => {
    const logger = new Logger('DrizzleProvider');
    const databaseUrl = process.env.DATABASE_URL;

    if (
      databaseUrl?.startsWith('postgres://') ||
      databaseUrl?.startsWith('postgresql://')
    ) {
      logger.log('Using PostgreSQL database');
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const schema = await import('./schema');
      const client = postgres(databaseUrl);
      return drizzle(client, { schema });
    }

    // Default: PGlite for zero-config development
    const dataDir = process.env.PGLITE_DATA_DIR || './data/pglite';
    logger.log(`Using PGlite database at ${dataDir}`);
    const { drizzle } = await import('drizzle-orm/pglite');
    const { PGlite } = await import('@electric-sql/pglite');
    const schema = await import('./schema');
    const client = new PGlite(dataDir);
    return drizzle(client, { schema });
  },
};
