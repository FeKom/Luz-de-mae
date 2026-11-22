import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // In-memory SQLite: each run starts from fresh demo data and leaves no file behind.
    env: { DATABASE_FILE: ':memory:' },
  },
});
