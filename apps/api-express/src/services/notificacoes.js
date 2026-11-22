// Notificações push. Integração real com Firebase Cloud Messaging (FCM) entra aqui:
//   - defina FCM_ENABLED=true e plugue o envio em `enviarFcm` (firebase-admin ou HTTP v1).
// No protótipo, toda notificação é registrada na tabela `notificacao` (auditável) e logada.
function enviarFcm(/* token, titulo, corpo */) {
  throw new Error('FCM não configurado: implemente enviarFcm com as credenciais do projeto Firebase');
}

function notificar(db, { gestante_id = null, ubs_id = null, titulo, corpo, fcm_token = null }) {
  let entregue = 0;
  if (process.env.FCM_ENABLED === 'true' && fcm_token) {
    try { enviarFcm(fcm_token, titulo, corpo); entregue = 1; } catch (e) { console.warn('[FCM]', e.message); }
  }
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO notificacao (gestante_id, ubs_id, titulo, corpo, canal, entregue) VALUES (?,?,?,?,?,?)'
  ).run(gestante_id, ubs_id, titulo, corpo, 'fcm', entregue);
  if (process.env.NODE_ENV !== 'test') console.log(`[notificação${entregue ? '' : ' simulada'}] ${titulo} — ${corpo}`);
  return Number(lastInsertRowid);
}
module.exports = { notificar };
