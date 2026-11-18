const express = require('express');
const cors = require('cors');
const { HttpError } = require('./services/http');

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_q, res) => {
    const nasc = db.prepare('SELECT COUNT(*) n FROM sinasc_nascidos_uf_ano').get().n;
    res.json({ status: 'ok', dados_datasus_importados: nasc > 0, hora: new Date().toISOString() });
  });
  app.use('/api/estatisticas', require('./routes/estatisticas')(db));
  app.use('/api', require('./routes/app')(db));

  app.use((_q, _r, next) => next(new HttpError(404, 'Rota não encontrada')));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _q, res, _n) => {
    if (err instanceof HttpError) return res.status(err.status).json({ erro: err.message, detalhes: err.details });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
    if (/constraint/i.test(err.message || '')) return res.status(409).json({ erro: 'Violação de integridade dos dados', detalhes: err.message });
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  });
  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const { setup } = require('./db/setup');
  const db = setup();
  const vazio = db.prepare('SELECT COUNT(*) n FROM sinasc_nascidos_uf_ano').get().n === 0;
  if (vazio) console.warn('⚠ Dados do DATASUS ainda não importados. Rode: npm run db:import');
  const port = Number(process.env.PORT) || 3000;
  createApp(db).listen(port, () => console.log(`Luz de Mãe API em http://localhost:${port}/api/health`));
}
