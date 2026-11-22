// Classificação de risco do registro de sintomas — REGRA DE TRIAGEM DEMONSTRATIVA (protótipo).
// Não substitui avaliação profissional; os limiares seguem o critério clássico de hipertensão (>=140/90 mmHg).
const { bad } = require('./http');

const SINTOMAS = {
  // sinais de alerta (alto): orientar contato imediato com UBS/urgência e avisar a equipe
  sangramento:               { nivel: 'alto',  rotulo: 'Sangramento vaginal' },
  perda_de_liquido:          { nivel: 'alto',  rotulo: 'Perda de líquido' },
  reducao_movimentos_fetais: { nivel: 'alto',  rotulo: 'Bebê mexendo menos que o habitual' },
  convulsao:                 { nivel: 'alto',  rotulo: 'Convulsão' },
  visao_turva:               { nivel: 'alto',  rotulo: 'Visão turva ou pontos brilhantes' },
  dor_de_cabeca_intensa:     { nivel: 'alto',  rotulo: 'Dor de cabeça forte que não passa' },
  dor_abdominal_intensa:     { nivel: 'alto',  rotulo: 'Dor forte na barriga' },
  // atenção (médio): acompanhar e informar a UBS
  inchaco_repentino:         { nivel: 'medio', rotulo: 'Inchaço repentino no rosto ou nas mãos' },
  febre:                     { nivel: 'medio', rotulo: 'Febre' },
  vomitos_persistentes:      { nivel: 'medio', rotulo: 'Vômitos que não param' },
  tontura:                   { nivel: 'medio', rotulo: 'Tontura ou desmaio' },
  dor_ao_urinar:             { nivel: 'medio', rotulo: 'Dor ou ardência ao urinar' },
};
const ORDEM = { baixo: 0, medio: 1, alto: 2 };

function classificarRisco({ pa_sistolica, pa_diastolica, sintomas = [] }) {
  const desconhecidos = sintomas.filter((s) => !SINTOMAS[s]);
  if (desconhecidos.length) throw bad('Sintomas desconhecidos', { desconhecidos, validos: Object.keys(SINTOMAS) });
  if ((pa_sistolica == null) !== (pa_diastolica == null)) throw bad('Informe pressão sistólica e diastólica juntas');
  if (pa_sistolica != null) {
    if (!Number.isInteger(pa_sistolica) || !Number.isInteger(pa_diastolica) || pa_sistolica < 50 || pa_sistolica > 300 || pa_diastolica < 30 || pa_diastolica > 200 || pa_diastolica >= pa_sistolica)
      throw bad('Valores de pressão arterial inválidos (ex.: 120 e 80)');
  }

  let nivel = 'baixo'; const motivos = [];
  const sobe = (n, motivo) => { motivos.push(motivo); if (ORDEM[n] > ORDEM[nivel]) nivel = n; };

  if (pa_sistolica != null) {
    if (pa_sistolica >= 140 || pa_diastolica >= 90) sobe('alto', `Pressão alta (${pa_sistolica}/${pa_diastolica} mmHg)`);
    else if (pa_sistolica >= 130 || pa_diastolica >= 85) sobe('medio', `Pressão no limite (${pa_sistolica}/${pa_diastolica} mmHg)`);
  }
  for (const s of sintomas) sobe(SINTOMAS[s].nivel, SINTOMAS[s].rotulo);
  return { nivel, motivos };
}

module.exports = { classificarRisco, SINTOMAS };
