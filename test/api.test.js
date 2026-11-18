// Testes de integração: importação do DATASUS + regras de negócio + API.  Rodar: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('../src/db/setup');
const { importAll } = require('../src/db/importRaw');
const { seedApp } = require('../src/db/seed');
const { createApp } = require('../src/server');
const { classificarRisco } = require('../src/services/risco');
const { infoGestacao } = require('../src/services/gestacao');

process.env.NODE_ENV = 'test';
let db, server, base, importacao;

before(async () => {
  db = setup({ file: ':memory:' });
  importacao = importAll(db);
  seedApp(db);
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => { server.close(); db.close(); });

const call = async (method, path, body) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
};

test('importação: 18 CSVs e todos os totais conferem com o arquivo original', () => {
  assert.equal(importacao.length, 18);
  for (const r of importacao) assert.ok(r.confere, `${r.arquivo} diverge: ${r.soma_dados} vs ${r.soma_total_csv}`);
});

test('importação é idempotente (rodar 2x não duplica)', () => {
  const antes = db.prepare('SELECT COUNT(*) n FROM sim_cid_ano').get().n;
  importAll(db);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sim_cid_ano').get().n, antes);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sinasc_cruzamento').get().n, 100);
});

test('hierarquia de causas: capítulos e grupos somam o mesmo total', () => {
  const s = (n) => db.prepare('SELECT SUM(qtd) t FROM sim_causa_ano WHERE nivel = ?').get(n).t;
  assert.equal(s('capitulo'), 290240);
  assert.equal(s('grupo'), 290240);
});

test('GET /estatisticas/resumo', async () => {
  const { status, body } = await call('GET', '/estatisticas/resumo');
  assert.equal(status, 200);
  assert.equal(body.obitos_fetais, 290240);
  assert.equal(body.nascidos_vivos, 27489150);
  assert.deepEqual(body.periodo, { inicio: 2015, fim: 2024 });
  assert.ok(body.taxa_mortalidade_fetal_por_mil > 5 && body.taxa_mortalidade_fetal_por_mil < 15);
});

test('GET /estatisticas/por-uf e /uf/:sigla', async () => {
  const lista = (await call('GET', '/estatisticas/por-uf?ano=2024')).body;
  assert.equal(lista.length, 27);
  const sp = (await call('GET', '/estatisticas/uf/SP')).body;
  assert.equal(sp.uf.codigo, 35);
  assert.ok(Math.abs(sp.consultas_prenatal.reduce((s, x) => s + x.pct, 0) - 100) < 0.6);
  assert.equal((await call('GET', '/estatisticas/uf/XX')).status, 404);
  assert.equal((await call('GET', '/estatisticas/por-uf?ano=abc')).status, 400);
});

test('prenatal x desfecho: quem não fez pré-natal tem mais baixo peso', async () => {
  const { body } = await call('GET', '/estatisticas/prenatal/desfecho/peso');
  const f = Object.fromEntries(body.destaque.por_faixa.map((x) => [x.faixa_consultas, x.pct]));
  assert.ok(f['Nenhuma'] > f['7 ou mais consultas'], JSON.stringify(f));
  assert.equal((await call('GET', '/estatisticas/prenatal/desfecho/xyz')).status, 400);
});

test('causas, CID, perfil e fontes', async () => {
  const c = (await call('GET', '/estatisticas/causas')).body;
  assert.equal(c.reduce((s, x) => s + x.qtd, 0), 290240);
  const cid = (await call('GET', '/estatisticas/cid?limit=3')).body;
  assert.equal(cid.length, 3);
  assert.equal((await call('GET', '/estatisticas/perfil/idade_mae')).status, 200);
  assert.equal((await call('GET', '/estatisticas/perfil/foo')).status, 400);
  const f = (await call('GET', '/estatisticas/fontes')).body;
  assert.equal(f.length, 18);
});

test('classificarRisco', () => {
  assert.equal(classificarRisco({ pa_sistolica: 118, pa_diastolica: 76, sintomas: [] }).nivel, 'baixo');
  assert.equal(classificarRisco({ pa_sistolica: 135, pa_diastolica: 86 }).nivel, 'medio');
  assert.equal(classificarRisco({ pa_sistolica: 150, pa_diastolica: 95 }).nivel, 'alto');
  assert.equal(classificarRisco({ sintomas: ['sangramento'] }).nivel, 'alto');
  assert.equal(classificarRisco({ sintomas: ['febre'] }).nivel, 'medio');
  assert.throws(() => classificarRisco({ sintomas: ['inventado'] }));
  assert.throws(() => classificarRisco({ pa_sistolica: 120 }));
});

test('idade gestacional e trimestre', () => {
  assert.deepEqual(infoGestacao('2026-01-01', '2026-03-12'), { semanas: 10, dias_no_total: 70, trimestre: 1, dpp: '2026-10-08' });
  assert.equal(infoGestacao('2026-01-01', '2026-06-25').trimestre, 2);
  assert.equal(infoGestacao('2026-01-01', '2026-09-01').trimestre, 3);
});

test('fluxo: sintoma de risco gera alerta na UBS e notifica a gestante', async () => {
  const baixo = await call('POST', '/sintomas', { gestante_id: 1, pa_sistolica: 112, pa_diastolica: 70, sintomas: [] });
  assert.equal(baixo.status, 201); assert.equal(baixo.body.risco.nivel, 'baixo'); assert.equal(baixo.body.alerta_ubs, null);

  const alto = await call('POST', '/sintomas', { gestante_id: 1, pa_sistolica: 150, pa_diastolica: 98, sintomas: ['dor_de_cabeca_intensa', 'visao_turva'] });
  assert.equal(alto.status, 201); assert.equal(alto.body.risco.nivel, 'alto');
  assert.equal(alto.body.alerta_ubs.ubs_id, 1); assert.equal(alto.body.alerta_ubs.status, 'aberto');

  const painel = (await call('GET', '/alertas?ubs_id=1&status=aberto')).body;
  assert.ok(painel.some((a) => a.origem === 'sintoma_risco' && a.gestante_nome.startsWith('Ana')));
  const notifs = (await call('GET', '/gestantes/1/notificacoes')).body;
  assert.ok(notifs.some((n) => n.titulo.includes('UBS')));

  assert.equal((await call('POST', '/sintomas', { gestante_id: 1, sintomas: ['x'] })).status, 400);
  assert.equal((await call('POST', '/sintomas', { gestante_id: 999 })).status, 404);
});

test('fluxo: consulta faltada gera busca ativa (prioridade alta se gestação de risco) e é idempotente', async () => {
  const cons = (await call('GET', '/gestantes/2/consultas')).body;
  const vencida = cons.find((c) => c.status === 'agendada' && c.descricao.startsWith('Retorno'));
  const r = await call('PATCH', `/consultas/${vencida.id}`, { status: 'faltou' });
  assert.equal(r.status, 200); assert.equal(r.body.consulta.status, 'faltou');
  assert.equal(r.body.alerta.nivel, 'alto'); assert.equal(r.body.alerta.origem, 'consulta_faltada');
  assert.equal((await call('PATCH', `/consultas/${vencida.id}`, { status: 'faltou' })).body.alerta.id, r.body.alerta.id);
  const total = db.prepare("SELECT COUNT(*) n FROM alerta_ubs WHERE origem = 'consulta_faltada' AND referencia_id = ?").get(vencida.id).n;
  assert.equal(total, 1);
  assert.equal((await call('PATCH', `/consultas/${vencida.id}`, { status: 'xx' })).status, 400);
});

test('job verificar-faltas marca consultas vencidas', async () => {
  const futuro = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const r = await call('POST', '/jobs/verificar-faltas', { hoje: futuro });
  assert.equal(r.status, 200);
  assert.ok(r.body.consultas_marcadas_como_faltou >= 1);
  assert.equal((await call('POST', '/jobs/verificar-faltas', { hoje: futuro })).body.consultas_marcadas_como_faltou, 0);
});

test('alerta: UBS atende e resolve', async () => {
  const a = (await call('GET', '/alertas?status=aberto')).body[0];
  const r = await call('PATCH', `/alertas/${a.id}`, { status: 'resolvido' });
  assert.equal(r.body.status, 'resolvido'); assert.ok(r.body.resolvido_em);
});

test('cadastro de gestante, orientações do trimestre e contexto regional', async () => {
  const hoje = new Date(Date.now() - 20 * 7 * 86400000).toISOString().slice(0, 10);
  const c = await call('POST', '/gestantes', { nome: 'Teste', data_nascimento: '1995-05-05', uf_codigo: 35, ubs_id: 1, dum: hoje });
  assert.equal(c.status, 201); assert.equal(c.body.gestacao.trimestre, 2);
  const o = (await call('GET', `/gestantes/${c.body.id}/orientacoes`)).body;
  assert.equal(o.trimestre, 2); assert.ok(o.orientacoes.length > 0);
  const ctx = (await call('GET', `/gestantes/${c.body.id}/contexto-regional`)).body;
  assert.equal(ctx.uf.sigla, 'SP');
  assert.equal((await call('POST', '/gestantes', { nome: 'X' })).status, 400);
  assert.equal((await call('POST', '/gestantes', { nome: 'X', data_nascimento: '1995-05-05', uf_codigo: 99, ubs_id: 1, dum: hoje })).status, 400);
  assert.equal((await call('GET', '/rota-inexistente')).status, 404);
});
