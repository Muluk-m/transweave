import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as schema from './schema';
import type { DrizzleDB } from './drizzle.types';

/**
 * Create an in-memory PGlite database for integration testing.
 * Each call returns a fresh, isolated database with migrations applied.
 */
export async function createTestDb(): Promise<{
  db: DrizzleDB;
  client: PGlite;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // Apply migration SQL files directly for maximum compatibility
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    // Split on drizzle-kit's statement breakpoints and execute each statement
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await client.exec(statement);
    }
  }

  return { db: db as DrizzleDB, client };
}

/**
 * Clean up a test database by closing the PGlite connection.
 */
export async function cleanupTestDb(client: PGlite): Promise<void> {
  await client.close();
}
