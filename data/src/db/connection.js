// Conexão SQLite usando o módulo nativo do Node (node:sqlite) — sem dependências nativas para compilar.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'luzdemae.db');
const RAW_DIR = process.env.RAW_DIR || path.join(ROOT, 'data', 'raw');

const REGIOES = [
  [1, 'Região Norte'], [2, 'Região Nordeste'], [3, 'Região Sudeste'], [4, 'Região Sul'], [5, 'Região Centro-Oeste'],
];

// [código IBGE, sigla, nome] — a região é o 1º dígito do código
const UFS = [
  [11, 'RO', 'Rondônia'], [12, 'AC', 'Acre'], [13, 'AM', 'Amazonas'], [14, 'RR', 'Roraima'], [15, 'PA', 'Pará'],
  [16, 'AP', 'Amapá'], [17, 'TO', 'Tocantins'], [21, 'MA', 'Maranhão'], [22, 'PI', 'Piauí'], [23, 'CE', 'Ceará'],
  [24, 'RN', 'Rio Grande do Norte'], [25, 'PB', 'Paraíba'], [26, 'PE', 'Pernambuco'], [27, 'AL', 'Alagoas'],
  [28, 'SE', 'Sergipe'], [29, 'BA', 'Bahia'], [31, 'MG', 'Minas Gerais'], [32, 'ES', 'Espírito Santo'],
  [33, 'RJ', 'Rio de Janeiro'], [35, 'SP', 'São Paulo'], [41, 'PR', 'Paraná'], [42, 'SC', 'Santa Catarina'],
  [43, 'RS', 'Rio Grande do Sul'], [50, 'MS', 'Mato Grosso do Sul'], [51, 'MT', 'Mato Grosso'], [52, 'GO', 'Goiás'],
  [53, 'DF', 'Distrito Federal'],
];

function openDb(file = DEFAULT_DB_PATH) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  return db;
}

function applySchema(db) {
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}

function seedDimensions(db) {
  const insR = db.prepare('INSERT OR IGNORE INTO regiao (codigo, nome) VALUES (?, ?)');
  const insU = db.prepare('INSERT OR IGNORE INTO uf (codigo, sigla, nome, regiao_codigo) VALUES (?, ?, ?, ?)');
  REGIOES.forEach(([c, n]) => insR.run(c, n));
  UFS.forEach(([c, s, n]) => insU.run(c, s, n, Math.floor(c / 10)));
}

// Executa fn dentro de uma transação (rollback automático em erro)
function tx(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { openDb, applySchema, seedDimensions, tx, DEFAULT_DB_PATH, RAW_DIR, ROOT, UFS, REGIOES };
