const express = require('express');
const est = require('../services/estatisticas');

module.exports = (db) => {
  const r = express.Router();
  r.get('/resumo', (_q, res) => res.json(est.resumo(db)));
  r.get('/serie-anual', (_q, res) => res.json(est.serieAnual(db)));
  r.get('/por-uf', (q, res) => res.json(est.porUf(db, q.query.ano)));
  r.get('/uf/:id', (q, res) => res.json(est.contextoUf(db, q.params.id)));      // código IBGE ou sigla (ex.: 35 ou SP)
  r.get('/prenatal/evolucao', (_q, res) => res.json(est.prenatalEvolucao(db)));
  r.get('/prenatal/desfecho/:dimensao', (q, res) => res.json(est.prenatalVsDesfecho(db, q.params.dimensao)));
  r.get('/causas', (q, res) => res.json(est.causas(db, q.query)));
  r.get('/causas/regiao', (q, res) => res.json(est.causasPorRegiao(db, q.query.nivel)));
  r.get('/cid', (q, res) => res.json(est.cid(db, q.query)));
  r.get('/perfil/:dimensao', (q, res) => res.json(est.perfil(db, q.params.dimensao, q.query.ano)));
  r.get('/fontes', (_q, res) => res.json(est.fontes(db)));
  return r;
};
