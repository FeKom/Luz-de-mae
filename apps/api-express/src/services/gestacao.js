// Cálculos de idade gestacional a partir da DUM (data da última menstruação)
const DAY = 86400000;
const toDate = (iso) => new Date(iso + 'T00:00:00Z');
const todayIso = () => new Date().toISOString().slice(0, 10);

function infoGestacao(dumIso, hojeIso = todayIso()) {
  const dias = Math.floor((toDate(hojeIso) - toDate(dumIso)) / DAY);
  const semanas = Math.max(0, Math.floor(dias / 7));
  const trimestre = semanas <= 13 ? 1 : semanas <= 27 ? 2 : 3;      // convenção usual: 1º até 13s6d, 2º até 27s6d
  const dpp = new Date(toDate(dumIso).getTime() + 280 * DAY).toISOString().slice(0, 10); // regra de Naegele simplificada: DUM + 280 dias
  return { semanas, dias_no_total: dias, trimestre, dpp };
}
module.exports = { infoGestacao, todayIso };
