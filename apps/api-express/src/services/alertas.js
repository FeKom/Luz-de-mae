// Regras de negócio centrais do Luz de Mãe: busca ativa pela UBS
const { tx } = require('../db/connection');
const { notificar } = require('./notificacoes');
const { todayIso } = require('./gestacao');
const { notFound } = require('./http');

const gestanteDe = (db, id) => db.prepare('SELECT * FROM gestante WHERE id = ?').get(id);

// Cria alerta (idempotente por origem+referencia). Retorna o alerta e se foi criado agora.
function criarAlerta(db, { gestante, origem, referencia_id, nivel, mensagem }) {
  const ja = db.prepare('SELECT * FROM alerta_ubs WHERE origem = ? AND referencia_id = ?').get(origem, referencia_id);
  if (ja) return { alerta: ja, criado: false };
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO alerta_ubs (gestante_id, ubs_id, origem, referencia_id, nivel, mensagem) VALUES (?,?,?,?,?,?)'
  ).run(gestante.id, gestante.ubs_id, origem, referencia_id, nivel, mensagem);
  notificar(db, { ubs_id: gestante.ubs_id, titulo: nivel === 'alto' ? 'Alerta prioritário' : 'Alerta de acompanhamento', corpo: mensagem });
  return { alerta: db.prepare('SELECT * FROM alerta_ubs WHERE id = ?').get(lastInsertRowid), criado: true };
}

// Registro de sintomas -> classifica risco (feito pela rota) e alerta a UBS se médio/alto
function alertarSintoma(db, gestante, registro, risco) {
  if (risco.nivel === 'baixo') return null;
  const msg = `${gestante.nome}: ${risco.motivos.join('; ')}. Recomenda-se contato/busca ativa.`;
  const r = criarAlerta(db, { gestante, origem: 'sintoma_risco', referencia_id: registro.id, nivel: risco.nivel, mensagem: msg });
  notificar(db, {
    gestante_id: gestante.id, fcm_token: gestante.fcm_token,
    titulo: risco.nivel === 'alto' ? 'Procure sua UBS agora' : 'Vamos acompanhar você',
    corpo: risco.nivel === 'alto'
      ? 'O que você registrou merece atenção. Procure a UBS ou uma unidade de urgência. Avisamos sua equipe de saúde.'
      : 'Registramos seus sintomas e avisamos sua UBS. Se piorar, procure atendimento.',
  });
  return r.alerta;
}

// Marca consulta como "faltou" e dispara a busca ativa
function registrarFalta(db, consultaId) {
  return tx(db, () => {
    const c = db.prepare('SELECT * FROM consulta_prenatal WHERE id = ?').get(consultaId);
    if (!c) throw notFound('Consulta não encontrada');
    const g = gestanteDe(db, c.gestante_id);
    db.prepare("UPDATE consulta_prenatal SET status = 'faltou', atualizado_em = datetime('now') WHERE id = ?").run(c.id);
    const nivel = g.gestacao_risco ? 'alto' : 'medio';   // gestação de risco: prioridade maior
    const { alerta } = criarAlerta(db, {
      gestante: g, origem: 'consulta_faltada', referencia_id: c.id, nivel,
      mensagem: `${g.nome} faltou à ${c.tipo} de ${c.data_agendada}${c.descricao ? ' (' + c.descricao + ')' : ''}${g.gestacao_risco ? ' — GESTAÇÃO DE RISCO' : ''}. Realizar busca ativa.`,
    });
    notificar(db, { gestante_id: g.id, fcm_token: g.fcm_token, titulo: 'Sentimos sua falta 💗', corpo: 'Você não pôde ir à sua consulta. Vamos remarcar? Sua UBS vai entrar em contato.' });
    return alerta;
  });
}

// Rotina diária: consultas 'agendada' com data anterior a hoje viram 'faltou'
function verificarFaltas(db, hoje = todayIso()) {
  const vencidas = db.prepare("SELECT id FROM consulta_prenatal WHERE status = 'agendada' AND data_agendada < ? ORDER BY data_agendada").all(hoje);
  return vencidas.map(({ id }) => registrarFalta(db, id));
}

module.exports = { criarAlerta, alertarSintoma, registrarFalta, verificarFaltas };
