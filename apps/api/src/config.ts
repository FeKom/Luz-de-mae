import { resolve } from 'node:path';

const apiRoot = resolve(import.meta.dirname, '..');
const databaseFile = process.env.DATABASE_FILE ?? 'luz-de-mae.sqlite';

/** Runtime settings, read once from the environment with dev-friendly defaults. */
export const config = {
  port: Number(process.env.PORT ?? 3001),
  /** `:memory:` keeps the database in RAM, which the e2e tests use. */
  databaseFile: databaseFile === ':memory:' ? databaseFile : resolve(apiRoot, databaseFile),
  migrationsFolder: resolve(apiRoot, 'drizzle'),
  /** DATASUS CSVs extracted by data/scripts/extract_tabnet.py. */
  datasusFolder: resolve(apiRoot, '..', '..', 'data', 'raw'),
  /** Grace period before a past appointment still marked SCHEDULED counts as missed. */
  missedAppointmentGraceHours: 2,
} as const;
