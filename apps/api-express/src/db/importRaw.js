// Importa os CSVs de data/raw (DATASUS SIM/SINASC, formato longo "linha,coluna,valor") para tabelas tipadas.
// Uso: node src/db/importRaw.js   (idempotente: cada arquivo substitui os dados anteriores da sua tabela)
const fs = require('node:fs');
const path = require('node:path');
const { openDb, applySchema, seedDimensions, tx, RAW_DIR, DEFAULT_DB_PATH } = require('./connection');

// ---------- leitura de CSV (aspas, CRLF, BOM) ----------
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((v) => v !== '')) rows.push(row); }
  return rows;
}

function readLong(file) {
  const [head, ...body] = parseCsv(fs.readFileSync(file, 'utf8'));
  if (head.join(',') !== 'linha,coluna,valor') throw new Error(`${path.basename(file)}: cabeçalho inesperado (${head.join(',')})`);
  return body.map((r, i) => {
    const valor = Number(r[2]);
    if (!Number.isInteger(valor)) throw new Error(`${path.basename(file)} linha ${i + 2}: valor não numérico "${r[2]}"`);
    return { linha: r[0].trim(), coluna: r[1].trim(), valor };
  });
}

// ---------- normalizações ----------
const isTotal = (s) => s === 'Total';
const norm = (s) => s.replace(/\s+/g, ' ').replace(/(\d)\s+g\b/g, '$1g').trim(); // "1000 a 1499 g" -> "1000 a 1499g"
const codeOf = (s) => { const n = parseInt(s, 10); if (Number.isNaN(n)) throw new Error(`Código inválido: "${s}"`); return n; };

function causa(linha) {
  return linha.startsWith('. ') ? { causa: norm(linha.slice(2)), nivel: 'grupo' } : { causa: norm(linha), nivel: 'capitulo' };
}

// ---------- definição de cada arquivo ----------
// map(r, ctx) devolve o registro; ctx.ol / ctx.oc = ordem (1..n) da linha/coluna conforme aparece no arquivo.
// check(rec) indica quais registros entram na conferência contra o "Total" do CSV.
const PERFIL = (dimensao) => ({
  table: 'sim_perfil_ano', cols: ['dimensao', 'categoria', 'ordem', 'ano', 'qtd'],
  map: (r, c) => ({ dimensao, categoria: norm(r.linha), ordem: c.ol, ano: +r.coluna, qtd: r.valor }),
});
const CRUZ = (dimensao) => ({
  table: 'sinasc_cruzamento', cols: ['dimensao', 'faixa_consultas', 'faixa_ordem', 'categoria', 'cat_ordem', 'qtd'],
  map: (r, c) => ({ dimensao, faixa_consultas: norm(r.linha), faixa_ordem: c.ol, categoria: norm(r.coluna), cat_ordem: c.oc, qtd: r.valor }),
  // vários arquivos gravam na mesma tabela: só apaga a sua dimensão
  deleteWhere: ['dimensao = ?', dimensao],
});

const IMPORTERS = [
  { file: 'nascidos_vivos_uf_ano.csv', table: 'sinasc_nascidos_uf_ano', cols: ['uf_codigo', 'ano', 'qtd'],
    map: (r) => ({ uf_codigo: codeOf(r.linha), ano: +r.coluna, qtd: r.valor }) },
  { file: 'nascidos_consultas_prenatal_uf.csv', table: 'sinasc_consultas_uf', cols: ['uf_codigo', 'faixa', 'ordem', 'qtd'],
    map: (r, c) => ({ uf_codigo: codeOf(r.linha), faixa: norm(r.coluna), ordem: c.oc, qtd: r.valor }) },
  { file: 'nascidos_consultas_prenatal_ano.csv', table: 'sinasc_consultas_ano', cols: ['ano', 'faixa', 'ordem', 'qtd'],
    map: (r, c) => ({ ano: +r.coluna, faixa: norm(r.linha), ordem: c.ol, qtd: r.valor }) },
  { file: 'nascidos_adequacao_prenatal_uf.csv', table: 'sinasc_adequacao_uf', cols: ['uf_codigo', 'adequacao', 'ordem', 'qtd'],
    // "Total" aqui é a soma de todas as categorias, inclusive "Não Classificados"
    map: (r, c) => ({ uf_codigo: codeOf(r.linha), adequacao: norm(r.coluna), ordem: c.oc, qtd: r.valor }) },
  { file: 'nascidos_consultas_x_peso.csv', ...CRUZ('peso') },
  { file: 'nascidos_consultas_x_duracao.csv', ...CRUZ('duracao_gestacao') },
  { file: 'nascidos_consultas_x_apgar5.csv', ...CRUZ('apgar5') },

  { file: 'obitos_fetais_uf_ano.csv', table: 'sim_obitos_uf_ano', cols: ['uf_codigo', 'ano', 'qtd'],
    map: (r) => ({ uf_codigo: codeOf(r.linha), ano: +r.coluna, qtd: r.valor }) },
  { file: 'obitos_fetais_causa_ano.csv', table: 'sim_causa_ano', cols: ['causa', 'nivel', 'ano', 'qtd'],
    map: (r) => ({ ...causa(r.linha), ano: +r.coluna, qtd: r.valor }),
    check: (x) => x.nivel === 'capitulo' },
  { file: 'obitos_fetais_causa_regiao.csv', table: 'sim_causa_regiao', cols: ['causa', 'nivel', 'regiao_codigo', 'qtd'],
    map: (r) => ({ ...causa(r.linha), regiao_codigo: codeOf(r.coluna), qtd: r.valor }),
    check: (x) => x.nivel === 'capitulo' },
  { file: 'obitos_fetais_cid_categoria_ano.csv', table: 'sim_cid_ano', cols: ['cid', 'descricao', 'ano', 'qtd'],
    map: (r) => {
      const m = r.linha.replace(/^@/, '').match(/^(\S+)\s+(.*)$/); // "P00 Feto..." / "@P78 Outros..."
      if (!m) throw new Error(`CID inválido: "${r.linha}"`);
      return { cid: m[1], descricao: norm(m[2]), ano: +r.coluna, qtd: r.valor };
    } },
  { file: 'obitos_fetais_cor_raca_ano.csv', ...PERFIL('cor_raca') },
  { file: 'obitos_fetais_idade_mae_ano.csv', ...PERFIL('idade_mae') },
  { file: 'obitos_fetais_escolaridade_mae_ano.csv', ...PERFIL('escolaridade_mae') },
  { file: 'obitos_fetais_peso_ano.csv', ...PERFIL('peso') },
  { file: 'obitos_fetais_duracao_gestacao_ano.csv', ...PERFIL('duracao_gestacao') },
  { file: 'obitos_fetais_investigacao_uf.csv', table: 'sim_investigacao_uf', cols: ['uf_codigo', 'situacao', 'ordem', 'qtd'],
    map: (r, c) => ({ uf_codigo: codeOf(r.linha), situacao: norm(r.coluna), ordem: c.oc, qtd: r.valor }) },
  { file: 'obitos_fetais_relacao_parto_uf.csv', table: 'sim_relacao_parto_uf', cols: ['uf_codigo', 'momento', 'ordem', 'qtd'],
    map: (r, c) => ({ uf_codigo: codeOf(r.linha), momento: norm(r.coluna), ordem: c.oc, qtd: r.valor }) },
];

// Total oficial do CSV: célula (Total,Total); senão soma da coluna Total; senão soma da linha Total.
function csvTotal(rows) {
  const both = rows.find((r) => isTotal(r.linha) && isTotal(r.coluna));
  if (both) return both.valor;
  const col = rows.filter((r) => isTotal(r.coluna) && !isTotal(r.linha));
  if (col.length) return col.reduce((s, r) => s + r.valor, 0);
  const lin = rows.filter((r) => isTotal(r.linha) && !isTotal(r.coluna));
  return lin.length ? lin.reduce((s, r) => s + r.valor, 0) : null;
}

function importFile(db, dir, spec) {
  const rows = readLong(path.join(dir, spec.file));
  const data = rows.filter((r) => !isTotal(r.linha) && !isTotal(r.coluna));

  // ordem de aparição de linhas/colunas no CSV (1..n), ignorando "Total"
  const ol = new Map(), oc = new Map();
  data.forEach((r) => { if (!ol.has(r.linha)) ol.set(r.linha, ol.size + 1); if (!oc.has(r.coluna)) oc.set(r.coluna, oc.size + 1); });

  const records = data.map((r) => spec.map(r, { ol: ol.get(r.linha), oc: oc.get(r.coluna) }));
  const somaDados = records.filter(spec.check || (() => true)).reduce((s, x) => s + x.qtd, 0);
  const somaCsv = csvTotal(rows);

  tx(db, () => {
    const [where, ...params] = spec.deleteWhere || ['1 = 1'];
    db.prepare(`DELETE FROM ${spec.table} WHERE ${where}`).run(...params);
    const ins = db.prepare(`INSERT INTO ${spec.table} (${spec.cols.join(',')}) VALUES (${spec.cols.map(() => '?').join(',')})`);
    for (const rec of records) ins.run(...spec.cols.map((k) => rec[k]));
    db.prepare('DELETE FROM importacao_log WHERE arquivo = ?').run(spec.file);
    db.prepare(`INSERT INTO importacao_log (arquivo, tabela, linhas, soma_dados, soma_total_csv, confere)
                VALUES (?, ?, ?, ?, ?, ?)`).run(spec.file, spec.table, records.length, somaDados, somaCsv, somaCsv === null || somaCsv === somaDados ? 1 : 0);
  });
  return { arquivo: spec.file, tabela: spec.table, linhas: records.length, soma_dados: somaDados, soma_total_csv: somaCsv, confere: somaCsv === null || somaCsv === somaDados };
}

function importAll(db, dir = RAW_DIR) {
  const faltando = IMPORTERS.filter((s) => !fs.existsSync(path.join(dir, s.file))).map((s) => s.file);
  if (faltando.length) throw new Error(`Arquivos ausentes em ${dir}: ${faltando.join(', ')}`);
  return IMPORTERS.map((spec) => importFile(db, dir, spec));
}

module.exports = { importAll, parseCsv, IMPORTERS };

if (require.main === module) {
  const db = openDb();
  applySchema(db); seedDimensions(db);
  const res = importAll(db);
  console.table(res.map((r) => ({ ...r, confere: r.confere ? 'OK' : 'DIVERGE' })));
  const ruins = res.filter((r) => !r.confere);
  console.log(`${res.length} arquivos importados em ${DEFAULT_DB_PATH} — ${ruins.length ? ruins.length + ' com divergência de total (veja tabela acima)' : 'todos os totais conferem'}.`);
  db.close();
}
