import { Logger, Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { config } from '../config.js';
import type { Database } from './database.js';
import { schema } from './schema.js';
import { isEmpty, seedDemoData } from './seed.js';

/** Opens the SQLite file, applies migrations and loads demo data on first run. */
function openDatabase(): Database {
  const client = new BetterSqlite3(config.databaseFile);
  client.pragma('journal_mode = WAL');
  client.pragma('foreign_keys = ON');
  const db = drizzle({ client, schema });
  migrate(db, { migrationsFolder: config.migrationsFolder });
  if (isEmpty(db)) {
    seedDemoData(db, new Date());
    new Logger('Database').log(`Dados de demonstração criados em ${config.databaseFile}`);
  }
  return db;
}

@Module({
  imports: [DrizzleModule.forRootAsync({ useFactory: () => ({ db: openDatabase() }) })],
})
export class DatabaseModule {}
