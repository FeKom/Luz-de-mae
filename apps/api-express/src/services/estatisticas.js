// Consultas analíticas sobre os dados públicos do DATASUS (SIM/SINASC) já importados
const { bad, notFound } = require('./http');

// Taxa de mortalidade fetal por mil = óbitos fetais / (nascidos vivos + óbitos fetais) x 1000
const taxa = (obitos, nascidos) => (obitos + nascidos ? Math.round((obitos / (obitos + nascidos)) * 10000) / 10 : null);
const pct = (parte, total) => (total ? Math.round((parte / total) * 1000) / 10 : null);
const num = (v) => (v === undefined || v === null ? null : Number(v));

function ano(q) {
  if (q === undefined || q === '') return null;
  const n = Number(q);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) throw bad('ano inválido');
  return n;
}

function resumo(db) {
  const nasc = db.prepare('SELECT SUM(qtd) t, MIN(ano) a0, MAX(ano) a1 FROM sinasc_nascidos_uf_ano').get();
  const obit = db.prepare('SELECT SUM(qtd) t FROM sim_obitos_uf_ano').get();
  const pre = db.prepare('SELECT faixa, SUM(qtd) qtd FROM sinasc_consultas_ano GROUP BY faixa').all();
  const por = Object.fromEntries(pre.map((r) => [r.faixa, r.qtd]));
  const total = pre.reduce((s, r) => s + r.qtd, 0);
  return {
    periodo: { inicio: nasc.a0, fim: nasc.a1 },
    nascidos_vivos: nasc.t, obitos_fetais: obit.t,
    taxa_mortalidade_fetal_por_mil: taxa(obit.t, nasc.t),
    pct_sem_prenatal: pct(por['Nenhuma'] || 0, total),
    pct_sete_ou_mais_consultas: pct(por['7 ou mais consultas'] || 0, total),
    fonte: 'DATASUS — SINASC (nascidos vivos) e SIM (óbitos fetais)',
  };
}

function serieAnual(db) {
  const n = new Map(db.prepare('SELECT ano, SUM(qtd) q FROM sinasc_nascidos_uf_ano GROUP BY ano').all().map((r) => [r.ano, r.q]));
  return db.prepare('SELECT ano, SUM(qtd) q FROM sim_obitos_uf_ano GROUP BY ano ORDER BY ano').all()
    .map((r) => ({ ano: r.ano, obitos_fetais: r.q, nascidos_vivos: n.get(r.ano) ?? 0, taxa_por_mil: taxa(r.q, n.get(r.ano) ?? 0) }));
}

function porUf(db, anoQ) {
  const a = ano(anoQ);
  const f = a ? 'WHERE ano = ?' : ''; const p = a ? [a] : [];
  const nasc = new Map(db.prepare(`SELECT uf_codigo c, SUM(qtd) q FROM sinasc_nascidos_uf_ano ${f} GROUP BY uf_codigo`).all(...p).map((r) => [r.c, r.q]));
  const obit = new Map(db.prepare(`SELECT uf_codigo c, SUM(qtd) q FROM sim_obitos_uf_ano ${f} GROUP BY uf_codigo`).all(...p).map((r) => [r.c, r.q]));
  const sem = new Map(db.prepare("SELECT uf_codigo c, qtd FROM sinasc_consultas_uf WHERE faixa = 'Nenhuma'").all().map((r) => [r.c, r.qtd]));
  const tot = new Map(db.prepare('SELECT uf_codigo c, SUM(qtd) q FROM sinasc_consultas_uf GROUP BY uf_codigo').all().map((r) => [r.c, r.q]));
  return db.prepare('SELECT u.codigo, u.sigla, u.nome, r.nome regiao FROM uf u JOIN regiao r ON r.codigo = u.regiao_codigo').all()
    .map((u) => ({
      uf_codigo: u.codigo, sigla: u.sigla, nome: u.nome, regiao: u.regiao,
      nascidos_vivos: nasc.get(u.codigo) ?? 0, obitos_fetais: obit.get(u.codigo) ?? 0,
      taxa_por_mil: taxa(obit.get(u.codigo) ?? 0, nasc.get(u.codigo) ?? 0),
      pct_sem_prenatal_periodo_completo: pct(sem.get(u.codigo) ?? 0, tot.get(u.codigo) ?? 0),
    }))
    .sort((x, y) => (y.taxa_por_mil ?? 0) - (x.taxa_por_mil ?? 0));
}

function resolveUf(db, id) {
  const u = /^\d+$/.test(String(id))
    ? db.prepare('SELECT u.*, r.nome regiao FROM uf u JOIN regiao r ON r.codigo = u.regiao_codigo WHERE u.codigo = ?').get(Number(id))
    : db.prepare('SELECT u.*, r.nome regiao FROM uf u JOIN regiao r ON r.codigo = u.regiao_codigo WHERE u.sigla = ?').get(String(id).toUpperCase());
  if (!u) throw notFound('UF não encontrada');
  return u;
}

// Panorama de uma UF: usado para dar contexto regional à gestante
function contextoUf(db, id) {
  const u = resolveUf(db, id);
  const resumoUf = porUf(db).find((x) => x.uf_codigo === u.codigo);
  const faixas = db.prepare('SELECT faixa, qtd FROM sinasc_consultas_uf WHERE uf_codigo = ? ORDER BY ordem').all(u.codigo);
  const tF = faixas.reduce((s, r) => s + r.qtd, 0);
  const adeq = db.prepare('SELECT adequacao, qtd FROM sinasc_adequacao_uf WHERE uf_codigo = ? ORDER BY ordem').all(u.codigo);
  const tA = adeq.reduce((s, r) => s + r.qtd, 0);
  const inv = db.prepare('SELECT situacao, qtd FROM sim_investigacao_uf WHERE uf_codigo = ? ORDER BY ordem').all(u.codigo);
  const tI = inv.reduce((s, r) => s + r.qtd, 0);
  const par = db.prepare('SELECT momento, qtd FROM sim_relacao_parto_uf WHERE uf_codigo = ? ORDER BY ordem').all(u.codigo);
  const tP = par.reduce((s, r) => s + r.qtd, 0);
  const serie = db.prepare('SELECT ano, qtd FROM sim_obitos_uf_ano WHERE uf_codigo = ? ORDER BY ano').all(u.codigo);
  return {
    uf: { codigo: u.codigo, sigla: u.sigla, nome: u.nome, regiao: u.regiao },
    resumo: resumoUf,
    consultas_prenatal: faixas.map((r) => ({ ...r, pct: pct(r.qtd, tF) })),
    adequacao_prenatal: adeq.map((r) => ({ ...r, pct: pct(r.qtd, tA) })),
    investigacao_obitos: inv.map((r) => ({ ...r, pct: pct(r.qtd, tI) })),
    obitos_por_momento: par.map((r) => ({ ...r, pct: pct(r.qtd, tP) })),
    obitos_serie: serie,
  };
}

function prenatalEvolucao(db) {
  const rows = db.prepare('SELECT ano, faixa, ordem, qtd FROM sinasc_consultas_ano ORDER BY ano, ordem').all();
  const totalAno = {}; rows.forEach((r) => { totalAno[r.ano] = (totalAno[r.ano] || 0) + r.qtd; });
  return rows.map((r) => ({ ...r, pct: pct(r.qtd, totalAno[r.ano]) }));
}

// Evidência central do projeto: resultado do bebê conforme o nº de consultas de pré-natal
function prenatalVsDesfecho(db, dimensao) {
  if (!['peso', 'duracao_gestacao', 'apgar5'].includes(dimensao)) throw bad('dimensao deve ser peso, duracao_gestacao ou apgar5');
  const rows = db.prepare('SELECT faixa_consultas, faixa_ordem, categoria, cat_ordem, qtd FROM sinasc_cruzamento WHERE dimensao = ? ORDER BY faixa_ordem, cat_ordem').all(dimensao);
  const tot = {}; rows.forEach((r) => { tot[r.faixa_consultas] = (tot[r.faixa_consultas] || 0) + r.qtd; });
  const grupos = {};
  rows.forEach((r) => {
    (grupos[r.faixa_consultas] ||= { faixa_consultas: r.faixa_consultas, ordem: r.faixa_ordem, total: tot[r.faixa_consultas], categorias: [] })
      .categorias.push({ categoria: r.categoria, qtd: r.qtd, pct: pct(r.qtd, tot[r.faixa_consultas]) });
  });
  const lista = Object.values(grupos);
  // destaques de leitura rápida
  const destaque = (nomes) => lista.map((g) => ({
    faixa_consultas: g.faixa_consultas,
    pct: Math.round(g.categorias.filter((c) => nomes.includes(c.categoria)).reduce((s, c) => s + (c.pct || 0), 0) * 10) / 10,
  }));
  const defs = {
    peso: { rotulo: 'Baixo peso ao nascer (< 2.500g)', cats: ['Menos de 500g', '500 a 999g', '1000 a 1499g', '1500 a 2499g'] },
    duracao_gestacao: { rotulo: 'Prematuros (< 37 semanas)', cats: ['Menos de 22 semanas', 'De 22 a 27 semanas', 'De 28 a 31 semanas', 'De 32 a 36 semanas'] },
    apgar5: { rotulo: 'Apgar do 5º minuto baixo (0 a 5)', cats: ['0 a 2', '3 a 5'] },
  }[dimensao];
  return { dimensao, destaque: { rotulo: defs.rotulo, por_faixa: destaque(defs.cats) }, faixas: lista };
}

function causas(db, { nivel = 'capitulo', ano: anoQ } = {}) {
  if (!['capitulo', 'grupo'].includes(nivel)) throw bad('nivel deve ser capitulo ou grupo');
  const a = ano(anoQ);
  const rows = db.prepare(`SELECT causa, SUM(qtd) qtd FROM sim_causa_ano WHERE nivel = ? ${a ? 'AND ano = ?' : ''} GROUP BY causa ORDER BY qtd DESC`).all(nivel, ...(a ? [a] : []));
  const t = rows.reduce((s, r) => s + r.qtd, 0);
  return rows.map((r) => ({ ...r, pct: pct(r.qtd, t) }));
}

function causasPorRegiao(db, nivel = 'grupo') {
  if (!['capitulo', 'grupo'].includes(nivel)) throw bad('nivel deve ser capitulo ou grupo');
  return db.prepare(`SELECT c.causa, r.nome regiao, c.regiao_codigo, c.qtd FROM sim_causa_regiao c JOIN regiao r ON r.codigo = c.regiao_codigo
                     WHERE c.nivel = ? ORDER BY c.regiao_codigo, c.qtd DESC`).all(nivel);
}

function cid(db, { ano: anoQ, limit = 15 } = {}) {
  const a = ano(anoQ); const l = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 200);
  return db.prepare(`SELECT cid, descricao, SUM(qtd) qtd FROM sim_cid_ano ${a ? 'WHERE ano = ?' : ''} GROUP BY cid, descricao ORDER BY qtd DESC LIMIT ?`).all(...(a ? [a] : []), l);
}

const DIM_PERFIL = ['cor_raca', 'idade_mae', 'escolaridade_mae', 'peso', 'duracao_gestacao'];
function perfil(db, dimensao, anoQ) {
  if (!DIM_PERFIL.includes(dimensao)) throw bad(`dimensao deve ser uma de: ${DIM_PERFIL.join(', ')}`);
  const a = ano(anoQ);
  const rows = db.prepare(`SELECT categoria, MIN(ordem) ordem, SUM(qtd) qtd FROM sim_perfil_ano WHERE dimensao = ? ${a ? 'AND ano = ?' : ''} GROUP BY categoria ORDER BY ordem`).all(dimensao, ...(a ? [a] : []));
  const t = rows.reduce((s, r) => s + r.qtd, 0);
  return rows.map((r) => ({ categoria: r.categoria, qtd: r.qtd, pct: pct(r.qtd, t) }));
}

function fontes(db) {
  return db.prepare('SELECT arquivo, tabela, linhas, soma_dados, soma_total_csv, confere, importado_em FROM importacao_log ORDER BY id').all()
    .map((r) => ({ ...r, confere: !!r.confere }));
}

module.exports = { resumo, serieAnual, porUf, contextoUf, resolveUf, prenatalEvolucao, prenatalVsDesfecho, causas, causasPorRegiao, cid, perfil, fontes, DIM_PERFIL, num };
