// Cria o banco: node src/db/setup.js [--reset]
const fs = require('node:fs');
const { openDb, applySchema, seedDimensions, DEFAULT_DB_PATH } = require('./connection');

function setup({ reset = false, file = DEFAULT_DB_PATH } = {}) {
  if (reset && file !== ':memory:') for (const s of ['', '-wal', '-shm']) fs.rmSync(file + s, { force: true });
  const db = openDb(file);
  applySchema(db);
  seedDimensions(db);
  return db;
}

module.exports = { setup };

if (require.main === module) {
  const reset = process.argv.includes('--reset');
  const db = setup({ reset });
  console.log(`Banco pronto em ${DEFAULT_DB_PATH}${reset ? ' (recriado)' : ''}`);
  db.close();
}
