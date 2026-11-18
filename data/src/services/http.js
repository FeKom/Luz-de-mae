class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const bad = (msg, details) => new HttpError(400, msg, details);
const notFound = (msg = 'Não encontrado') => new HttpError(404, msg);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function isoDate(v, campo) {
  if (typeof v !== 'string' || !ISO_DATE.test(v) || Number.isNaN(Date.parse(v))) throw bad(`${campo} deve estar no formato AAAA-MM-DD`);
  return v;
}
function reqStr(v, campo) {
  if (typeof v !== 'string' || !v.trim()) throw bad(`${campo} é obrigatório`);
  return v.trim();
}
function reqInt(v, campo) {
  const n = Number(v);
  if (!Number.isInteger(n)) throw bad(`${campo} deve ser um número inteiro`);
  return n;
}
module.exports = { HttpError, bad, notFound, isoDate, reqStr, reqInt };
