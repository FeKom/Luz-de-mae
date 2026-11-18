// Dados MOCKADOS do aplicativo (UBS, gestantes fictícias, consultas, orientações). Idempotente: recria as tabelas do app.
// Os dados epidemiológicos NÃO são mockados: vêm do DATASUS via `npm run db:import`.
const { openDb, applySchema, seedDimensions, tx } = require('./connection');
const { todayIso } = require('../services/gestacao');

const DAY = 86400000;
const addDays = (iso, n) => new Date(new Date(iso + 'T00:00:00Z').getTime() + n * DAY).toISOString().slice(0, 10);

// Conteúdo demonstrativo e simplificado. Validar com a equipe de saúde / Caderneta da Gestante (Ministério da Saúde) antes de uso real.
const ORIENTACOES = [
  [1, 'exame', 'Exames de sangue e urina', 'Hemograma, tipagem sanguínea/fator Rh, glicemia, EAS/urocultura',
    'São exames de rotina para ver se você está com anemia, qual é o seu tipo de sangue, como está o açúcar no sangue e se há infecção urinária (que pode ser silenciosa e precisa de tratamento).'],
  [1, 'exame', 'Testes rápidos de infecções', 'Sorologias: sífilis, HIV, hepatites B e C, toxoplasmose',
    'Testes simples, feitos na UBS, que procuram infecções que podem passar para o bebê. Quando descobertas cedo, quase todas têm tratamento que protege o bebê. A sífilis, por exemplo, é uma causa evitável de perda gestacional.'],
  [1, 'exame', 'Primeiro ultrassom', 'USG obstétrico / translucência nucal (11 a 14 semanas)',
    'Confirma a idade da gestação, os batimentos do coração e olha o desenvolvimento inicial do bebê.'],
  [1, 'cuidado', 'Ácido fólico e vitaminas', 'Suplementação de ácido fólico',
    'O ácido fólico ajuda na formação do sistema nervoso do bebê. Use somente o que a sua equipe de saúde indicar.'],
  [1, 'vacina', 'Vacina da gripe', 'Influenza',
    'Gestantes têm mais risco de complicações da gripe. A vacina é segura e pode ser tomada em qualquer fase da gestação.'],
  [2, 'exame', 'Ultrassom morfológico', 'USG morfológico (18 a 24 semanas)',
    'Olha com detalhe o corpinho do bebê: coração, cérebro, coluna, rins e outros órgãos.'],
  [2, 'exame', 'Curva do açúcar', 'TOTG / teste de tolerância à glicose (24 a 28 semanas)',
    'Mostra se você desenvolveu diabetes gestacional. Se aparecer, com alimentação e acompanhamento é possível controlar e proteger o bebê.'],
  [2, 'vacina', 'Vacina dTpa', 'Tríplice bacteriana acelular do adulto (a partir da 20ª semana)',
    'Protege você e passa defesas para o bebê contra difteria, tétano e coqueluche (tosse comprida) nos primeiros meses de vida. Deve ser tomada a cada gestação.'],
  [2, 'vacina', 'Vacina da hepatite B', 'Hepatite B (se não vacinada)',
    'Se você não completou o esquema de vacinação, a UBS verifica sua caderneta e indica as doses.'],
  [3, 'exame', 'Repetir testes de infecções', 'Sorologias do 3º trimestre',
    'Alguns testes (como sífilis e HIV) são repetidos perto do final da gestação para garantir proteção na hora do parto.'],
  [3, 'exame', 'Exame do estreptococo', 'Cultura para estreptococo do grupo B (35 a 37 semanas)',
    'Uma bactéria comum que pode ser passada ao bebê no parto. Se aparecer, o tratamento durante o parto é simples e protege o bebê.'],
  [3, 'cuidado', 'Conte os movimentos do bebê', 'Mobilograma / contagem de movimentos fetais',
    'Preste atenção em como o bebê mexe todos os dias. Se notar que ele está mexendo bem menos que o habitual, procure sua UBS ou a maternidade na hora, sem esperar.'],
  [3, 'cuidado', 'Plano de parto e maternidade de referência', 'Vinculação à maternidade',
    'Pergunte na UBS qual é sua maternidade de referência e leve a caderneta e os exames quando for.'],
  [1, 'sinal_alerta', 'Quando procurar a UBS ou urgência', 'Sinais de alerta',
    'Sangramento, perda de líquido, dor forte na barriga, febre, vômitos que não param ou desmaio: procure atendimento.'],
  [2, 'sinal_alerta', 'Atenção à pressão alta', 'Pré-eclâmpsia',
    'É uma complicação em que a pressão sobe na gestação. Dor de cabeça forte, visão turva ou pontos brilhantes e inchaço repentino no rosto e nas mãos são sinais para procurar atendimento no mesmo dia.'],
  [3, 'sinal_alerta', 'Sinais de que o bebê pode estar chegando', 'Trabalho de parto',
    'Contrações regulares e cada vez mais fortes, perda de líquido ou tampão com sangue: procure a maternidade.'],
];

function seedApp(db, hoje = todayIso()) {
  tx(db, () => {
    for (const t of ['notificacao', 'alerta_ubs', 'registro_sintoma', 'consulta_prenatal', 'gestante', 'ubs', 'orientacao']) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('notificacao','alerta_ubs','registro_sintoma','consulta_prenatal','gestante','ubs','orientacao')").run();

    const insUbs = db.prepare('INSERT INTO ubs (nome, municipio, uf_codigo, telefone) VALUES (?,?,?,?)');
    insUbs.run('UBS Vila Madalena', 'São Paulo', 35, '(11) 3000-0001');
    insUbs.run('UBS Jardim Ângela', 'São Paulo', 35, '(11) 3000-0002');
    insUbs.run('UBS Cidade Tiradentes', 'São Paulo', 35, '(11) 3000-0003');
    insUbs.run('UBS Guamá', 'Belém', 15, '(91) 3000-0004');

    // nome, nascimento, tel, uf, ubs, semanas de gestação hoje, 1ª gestação, risco
    const G = [
      ['Ana Beatriz Souza (demo)', '1998-04-12', '(11) 90000-0001', 35, 1, 10, 1, 0],
      ['Camila Ferreira (demo)', '1991-09-30', '(11) 90000-0002', 35, 1, 22, 0, 1],
      ['Juliana Alves (demo)', '2003-01-20', '(11) 90000-0003', 35, 2, 33, 1, 0],
      ['Patrícia Lima (demo)', '1987-06-05', '(91) 90000-0004', 15, 4, 30, 0, 1],
    ];
    const insG = db.prepare('INSERT INTO gestante (nome, data_nascimento, telefone, uf_codigo, ubs_id, dum, primeira_gestacao, gestacao_risco) VALUES (?,?,?,?,?,?,?,?)');
    G.forEach(([n, nasc, tel, uf, ubs, sem, prim, risco]) => insG.run(n, nasc, tel, uf, ubs, addDays(hoje, -sem * 7 - 3), prim, risco));

    const insC = db.prepare('INSERT INTO consulta_prenatal (gestante_id, data_agendada, tipo, descricao, status) VALUES (?,?,?,?,?)');
    insC.run(1, addDays(hoje, -21), 'consulta', 'Primeira consulta de pré-natal', 'realizada');
    insC.run(1, addDays(hoje, 4), 'exame', 'Ultrassom 11–14 semanas', 'agendada');
    insC.run(1, addDays(hoje, 25), 'consulta', 'Retorno pré-natal', 'agendada');
    insC.run(2, addDays(hoje, -30), 'consulta', 'Consulta pré-natal de alto risco', 'realizada');
    insC.run(2, addDays(hoje, -2), 'consulta', 'Retorno — pressão arterial', 'agendada');      // vencida: demonstra a busca ativa
    insC.run(2, addDays(hoje, 12), 'exame', 'Ultrassom morfológico', 'agendada');
    insC.run(3, addDays(hoje, -14), 'consulta', 'Consulta pré-natal', 'realizada');
    insC.run(3, addDays(hoje, 7), 'vacina', 'dTpa', 'agendada');
    insC.run(4, addDays(hoje, -10), 'consulta', 'Consulta pré-natal de alto risco', 'realizada');
    insC.run(4, addDays(hoje, 9), 'consulta', 'Retorno', 'agendada');

    const insO = db.prepare('INSERT INTO orientacao (trimestre, categoria, titulo, termo_medico, explicacao) VALUES (?,?,?,?,?)');
    ORIENTACOES.forEach((o) => insO.run(...o));
  });
}

module.exports = { seedApp, ORIENTACOES };

if (require.main === module) {
  const db = openDb();
  applySchema(db); seedDimensions(db);
  seedApp(db);
  console.log('Dados de demonstração do app criados (4 UBS, 4 gestantes fictícias, consultas, orientações).');
  db.close();
}
