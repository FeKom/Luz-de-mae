import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { schema } from './schema.js';

export type Database = BetterSQLite3Database<typeof schema>;
