import type { Trimester } from './gestation.js';

export type CareItemKind = 'EXAM' | 'VACCINE';

export interface CareItem {
  id: string;
  kind: CareItemKind;
  trimester: Trimester;
  title: string;
  /** What the item is for, in everyday words. */
  plainLanguage: string;
}

/** Routine prenatal care from the Caderneta da Gestante, grouped by trimester. */
export const CARE_ITEMS: CareItem[] = [
  {
    id: 'hemograma-1t',
    kind: 'EXAM',
    trimester: 1,
    title: 'Hemograma',
    plainLanguage: 'Exame de sangue que mostra se você está com anemia.',
  },
  {
    id: 'tipagem',
    kind: 'EXAM',
    trimester: 1,
    title: 'Tipagem sanguínea e fator Rh',
    plainLanguage: 'Descobre seu tipo de sangue. Se for Rh negativo, você vai precisar de um cuidado extra.',
  },
  {
    id: 'glicemia-1t',
    kind: 'EXAM',
    trimester: 1,
    title: 'Glicemia de jejum',
    plainLanguage: 'Mede o açúcar no sangue para descobrir cedo o diabetes da gestação.',
  },
  {
    id: 'testes-rapidos-1t',
    kind: 'EXAM',
    trimester: 1,
    title: 'Testes rápidos de sífilis, HIV e hepatites',
    plainLanguage: 'Teste de furinho no dedo. Se der positivo, o tratamento protege o bebê.',
  },
  {
    id: 'urina-1t',
    kind: 'EXAM',
    trimester: 1,
    title: 'Exame de urina e urocultura',
    plainLanguage: 'Procura infecção urinária, que pode causar parto antes da hora.',
  },
  {
    id: 'usg-1t',
    kind: 'EXAM',
    trimester: 1,
    title: 'Ultrassom obstétrico',
    plainLanguage: 'Confirma de quantas semanas você está e se o bebê está bem.',
  },
  {
    id: 'vacina-hepatite-b',
    kind: 'VACCINE',
    trimester: 1,
    title: 'Vacina Hepatite B',
    plainLanguage: 'Protege você e o bebê contra a hepatite B. São 3 doses.',
  },
  {
    id: 'vacina-influenza',
    kind: 'VACCINE',
    trimester: 1,
    title: 'Vacina da gripe (Influenza)',
    plainLanguage: 'Gestantes têm mais risco de complicação com gripe. Pode tomar em qualquer fase.',
  },
  {
    id: 'totg',
    kind: 'EXAM',
    trimester: 2,
    title: 'Curva glicêmica (TOTG), entre 24 e 28 semanas',
    plainLanguage: 'Você bebe um líquido doce e mede o açúcar depois. Confirma ou descarta diabetes gestacional.',
  },
  {
    id: 'usg-morfologico',
    kind: 'EXAM',
    trimester: 2,
    title: 'Ultrassom morfológico',
    plainLanguage: 'Olha com detalhe como os órgãos do bebê estão se formando.',
  },
  {
    id: 'vacina-dtpa',
    kind: 'VACCINE',
    trimester: 2,
    title: 'Vacina dTpa, a partir de 20 semanas',
    plainLanguage: 'Passa para o bebê proteção contra coqueluche, que é grave nos primeiros meses.',
  },
  {
    id: 'hemograma-3t',
    kind: 'EXAM',
    trimester: 3,
    title: 'Hemograma do 3º trimestre',
    plainLanguage: 'Repete o exame de anemia para chegar bem na hora do parto.',
  },
  {
    id: 'testes-rapidos-3t',
    kind: 'EXAM',
    trimester: 3,
    title: 'Testes rápidos de sífilis e HIV (repetição)',
    plainLanguage: 'Repete os testes porque uma infecção nova ainda pode ser tratada antes do parto.',
  },
  {
    id: 'estreptococo-b',
    kind: 'EXAM',
    trimester: 3,
    title: 'Pesquisa de estreptococo B, entre 35 e 37 semanas',
    plainLanguage: 'Procura uma bactéria que pode passar para o bebê no parto. Se tiver, há tratamento.',
  },
];

export interface GlossaryEntry {
  term: string;
  meaning: string;
}

/** Medical words that show up in prenatal visits, translated to everyday language. */
export const GLOSSARY: GlossaryEntry[] = [
  { term: 'DUM', meaning: 'Data da última menstruação. É dela que se conta a idade da gestação.' },
  { term: 'DPP', meaning: 'Data provável do parto. Uma estimativa: o bebê pode nascer de 37 a 42 semanas.' },
  { term: 'IG (idade gestacional)', meaning: 'Há quantas semanas você está grávida.' },
  {
    term: 'Pré-eclâmpsia',
    meaning: 'Pressão alta que aparece na gestação e pode afetar rins, fígado e o bebê. Precisa de cuidado rápido.',
  },
  { term: 'Diabetes gestacional', meaning: 'Açúcar alto no sangue que aparece na gravidez. Controla com dieta e acompanhamento.' },
  { term: 'BCF', meaning: 'Batimentos do coração do bebê, ouvidos na consulta com um aparelho.' },
  { term: 'Altura uterina', meaning: 'Medida da barriga com fita métrica, para ver se o bebê está crescendo bem.' },
  { term: 'Edema', meaning: 'Inchaço. Um pouco nos pés é comum; no rosto e nas mãos, de repente, é sinal de alerta.' },
  { term: 'Placenta prévia', meaning: 'Quando a placenta fica na frente da saída do útero. Pode causar sangramento.' },
  { term: 'Bolsa rota', meaning: 'A bolsa de água estourou. Vá para a maternidade.' },
  { term: 'Óbito fetal', meaning: 'Quando o bebê morre ainda dentro da barriga. Muitos casos são evitáveis com pré-natal.' },
  { term: 'Pré-natal', meaning: 'O acompanhamento da gestação na UBS: consultas, exames e vacinas.' },
];
