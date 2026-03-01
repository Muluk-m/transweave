import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './schema';

export type DrizzleDB =
  | PgliteDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>;
