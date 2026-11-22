const express = require('express');
const { bad, notFound, isoDate, reqStr, reqInt } = require('../services/http');
const { infoGestacao, todayIso } = require('../services/gestacao');
const { classificarRisco, SINTOMAS } = require('../services/risco');
const { alertarSintoma, registrarFalta, verificarFaltas } = require('../services/alertas');
const { contextoUf } = require('../services/estatisticas');
const { tx } = require('../db/connection');

const STATUS_CONSULTA = ['agendada', 'realizada', 'faltou', 'cancelada'];
const STATUS_ALERTA = ['aberto', 'em_atendimento', 'resolvido'];
const bool01 = (v) => (v === true || v === 1 || v === '1' ? 1 : 0);

module.exports = (db) => {
  const r = express.Router();

  const gestanteOr404 = (id) => {
    const g = db.prepare(`SELECT g.*, u.nome ubs_nome, f.sigla uf_sigla FROM gestante g
                          JOIN ubs u ON u.id = g.ubs_id JOIN uf f ON f.codigo = g.uf_codigo WHERE g.id = ?`).get(Number(id));
    if (!g) throw notFound('Gestante não encontrada');
    return g;
  };
  const comGestacao = (g) => ({ ...g, gestacao: infoGestacao(g.dum) });

  // ---------- UBS ----------
  r.get('/ubs', (_q, res) => res.json(db.prepare('SELECT * FROM ubs ORDER BY nome').all()));
  r.post('/ubs', (q, res) => {
    const b = q.body || {};
    const uf = reqInt(b.uf_codigo, 'uf_codigo');
    if (!db.prepare('SELECT 1 FROM uf WHERE codigo = ?').get(uf)) throw bad('uf_codigo inexistente');
    const { lastInsertRowid } = db.prepare('INSERT INTO ubs (nome, municipio, uf_codigo, telefone) VALUES (?,?,?,?)')
      .run(reqStr(b.nome, 'nome'), reqStr(b.municipio, 'municipio'), uf, b.telefone ?? null);
    res.status(201).json(db.prepare('SELECT * FROM ubs WHERE id = ?').get(lastInsertRowid));
  });

  // ---------- Gestantes ----------
  r.post('/gestantes', (q, res) => {
    const b = q.body || {};
    const uf = reqInt(b.uf_codigo, 'uf_codigo'), ubs = reqInt(b.ubs_id, 'ubs_id');
    if (!db.prepare('SELECT 1 FROM uf WHERE codigo = ?').get(uf)) throw bad('uf_codigo inexistente');
    if (!db.prepare('SELECT 1 FROM ubs WHERE id = ?').get(ubs)) throw bad('ubs_id inexistente');
    const dum = isoDate(b.dum, 'dum');
    if (infoGestacao(dum).dias_no_total < 0 || infoGestacao(dum).semanas > 44) throw bad('dum fora do intervalo plausível de uma gestação');
    const { lastInsertRowid } = db.prepare(`INSERT INTO gestante (nome, data_nascimento, telefone, uf_codigo, ubs_id, dum, primeira_gestacao, gestacao_risco, fcm_token)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(reqStr(b.nome, 'nome'), isoDate(b.data_nascimento, 'data_nascimento'), b.telefone ?? null, uf, ubs, dum,
      bool01(b.primeira_gestacao), bool01(b.gestacao_risco), b.fcm_token ?? null);
    res.status(201).json(comGestacao(gestanteOr404(lastInsertRowid)));
  });
  r.get('/gestantes', (q, res) => {
    const ubs = q.query.ubs_id ? Number(q.query.ubs_id) : null;
    const rows = db.prepare(`SELECT g.*, u.nome ubs_nome, f.sigla uf_sigla FROM gestante g JOIN ubs u ON u.id = g.ubs_id JOIN uf f ON f.codigo = g.uf_codigo
                             ${ubs ? 'WHERE g.ubs_id = ?' : ''} ORDER BY g.nome`).all(...(ubs ? [ubs] : []));
    res.json(rows.map(comGestacao));
  });
  r.get('/gestantes/:id', (q, res) => {
    const g = comGestacao(gestanteOr404(q.params.id));
    const proximas = db.prepare("SELECT * FROM consulta_prenatal WHERE gestante_id = ? AND status = 'agendada' ORDER BY data_agendada LIMIT 5").all(g.id);
    const alertasAbertos = db.prepare("SELECT COUNT(*) n FROM alerta_ubs WHERE gestante_id = ? AND status != 'resolvido'").get(g.id).n;
    res.json({ ...g, proximas_consultas: proximas, alertas_abertos: alertasAbertos });
  });
  r.get('/gestantes/:id/consultas', (q, res) => {
    const g = gestanteOr404(q.params.id);
    res.json(db.prepare('SELECT * FROM consulta_prenatal WHERE gestante_id = ? ORDER BY data_agendada').all(g.id));
  });
  r.get('/gestantes/:id/sintomas', (q, res) => {
    const g = gestanteOr404(q.params.id);
    res.json(db.prepare('SELECT * FROM registro_sintoma WHERE gestante_id = ? ORDER BY registrado_em DESC, id DESC').all(g.id)
      .map((s) => ({ ...s, sintomas: JSON.parse(s.sintomas) })));
  });
  r.get('/gestantes/:id/notificacoes', (q, res) => {
    const g = gestanteOr404(q.params.id);
    res.json(db.prepare('SELECT * FROM notificacao WHERE gestante_id = ? ORDER BY id DESC').all(g.id));
  });
  // Orientações do trimestre atual (tradutor de termos médicos + exames/vacinas)
  r.get('/gestantes/:id/orientacoes', (q, res) => {
    const g = comGestacao(gestanteOr404(q.params.id));
    res.json({ trimestre: g.gestacao.trimestre, semanas: g.gestacao.semanas,
      orientacoes: db.prepare('SELECT * FROM orientacao WHERE trimestre = ? ORDER BY categoria, id').all(g.gestacao.trimestre) });
  });
  // Liga o app aos dados públicos: situação do pré-natal e da mortalidade fetal na UF da gestante
  r.get('/gestantes/:id/contexto-regional', (q, res) => res.json(contextoUf(db, gestanteOr404(q.params.id).uf_codigo)));

  // ---------- Consultas / exames / vacinas ----------
  r.post('/consultas', (q, res) => {
    const b = q.body || {};
    const g = gestanteOr404(reqInt(b.gestante_id, 'gestante_id'));
    const tipo = b.tipo ?? 'consulta';
    if (!['consulta', 'exame', 'vacina'].includes(tipo)) throw bad('tipo deve ser consulta, exame ou vacina');
    const { lastInsertRowid } = db.prepare('INSERT INTO consulta_prenatal (gestante_id, data_agendada, tipo, descricao) VALUES (?,?,?,?)')
      .run(g.id, isoDate(b.data_agendada, 'data_agendada'), tipo, b.descricao ?? null);
    res.status(201).json(db.prepare('SELECT * FROM consulta_prenatal WHERE id = ?').get(lastInsertRowid));
  });
  r.patch('/consultas/:id', (q, res) => {
    const status = (q.body || {}).status;
    if (!STATUS_CONSULTA.includes(status)) throw bad(`status deve ser um de: ${STATUS_CONSULTA.join(', ')}`);
    const id = Number(q.params.id);
    const c = db.prepare('SELECT * FROM consulta_prenatal WHERE id = ?').get(id);
    if (!c) throw notFound('Consulta não encontrada');
    let alerta = null;
    if (status === 'faltou') alerta = registrarFalta(db, id);   // dispara busca ativa na UBS
    else db.prepare("UPDATE consulta_prenatal SET status = ?, atualizado_em = datetime('now') WHERE id = ?").run(status, id);
    res.json({ consulta: db.prepare('SELECT * FROM consulta_prenatal WHERE id = ?').get(id), alerta });
  });

  // ---------- Sintomas ----------
  r.get('/sintomas/opcoes', (_q, res) => res.json(Object.entries(SINTOMAS).map(([codigo, s]) => ({ codigo, rotulo: s.rotulo, nivel: s.nivel }))));
  r.post('/sintomas', (q, res) => {
    const b = q.body || {};
    const g = gestanteOr404(reqInt(b.gestante_id, 'gestante_id'));
    const sintomas = b.sintomas ?? [];
    if (!Array.isArray(sintomas)) throw bad('sintomas deve ser uma lista');
    const pa = { pa_sistolica: b.pa_sistolica ?? null, pa_diastolica: b.pa_diastolica ?? null };
    const risco = classificarRisco({ ...pa, sintomas });
    const out = tx(db, () => {
      const { lastInsertRowid } = db.prepare('INSERT INTO registro_sintoma (gestante_id, pa_sistolica, pa_diastolica, sintomas, observacao, nivel_risco) VALUES (?,?,?,?,?,?)')
        .run(g.id, pa.pa_sistolica, pa.pa_diastolica, JSON.stringify([...new Set(sintomas)]), b.observacao ?? null, risco.nivel);
      const registro = db.prepare('SELECT * FROM registro_sintoma WHERE id = ?').get(lastInsertRowid);
      return { registro, alerta: alertarSintoma(db, g, registro, risco) };
    });
    res.status(201).json({ registro: { ...out.registro, sintomas: JSON.parse(out.registro.sintomas) }, risco, alerta_ubs: out.alerta });
  });

  // ---------- Painel da UBS: alertas ----------
  r.get('/alertas', (q, res) => {
    const w = [], p = [];
    if (q.query.ubs_id) { w.push('a.ubs_id = ?'); p.push(Number(q.query.ubs_id)); }
    if (q.query.status) {
      if (!STATUS_ALERTA.includes(q.query.status)) throw bad(`status deve ser um de: ${STATUS_ALERTA.join(', ')}`);
      w.push('a.status = ?'); p.push(q.query.status);
    }
    res.json(db.prepare(`SELECT a.*, g.nome gestante_nome, g.telefone gestante_telefone, g.gestacao_risco FROM alerta_ubs a JOIN gestante g ON g.id = a.gestante_id
      ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY CASE a.nivel WHEN 'alto' THEN 0 ELSE 1 END, a.criado_em DESC, a.id DESC`).all(...p));
  });
  r.patch('/alertas/:id', (q, res) => {
    const status = (q.body || {}).status;
    if (!STATUS_ALERTA.includes(status)) throw bad(`status deve ser um de: ${STATUS_ALERTA.join(', ')}`);
    const id = Number(q.params.id);
    if (!db.prepare('SELECT 1 FROM alerta_ubs WHERE id = ?').get(id)) throw notFound('Alerta não encontrado');
    db.prepare("UPDATE alerta_ubs SET status = ?, resolvido_em = CASE WHEN ? = 'resolvido' THEN datetime('now') ELSE NULL END WHERE id = ?").run(status, status, id);
    res.json(db.prepare('SELECT * FROM alerta_ubs WHERE id = ?').get(id));
  });

  // ---------- Orientações (tradutor + calendário) ----------
  r.get('/orientacoes', (q, res) => {
    const w = [], p = [];
    if (q.query.trimestre) { w.push('trimestre = ?'); p.push(reqInt(q.query.trimestre, 'trimestre')); }
    if (q.query.categoria) { w.push('categoria = ?'); p.push(q.query.categoria); }
    res.json(db.prepare(`SELECT * FROM orientacao ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY trimestre, categoria, id`).all(...p));
  });

  // ---------- Rotina de busca ativa (cron/diária) ----------
  r.post('/jobs/verificar-faltas', (q, res) => {
    const hoje = (q.body || {}).hoje ? isoDate(q.body.hoje, 'hoje') : todayIso();
    const alertas = verificarFaltas(db, hoje);
    res.json({ referencia: hoje, consultas_marcadas_como_faltou: alertas.length, alertas });
  });

  return r;
};
