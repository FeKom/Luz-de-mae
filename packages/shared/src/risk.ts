/**
 * Warning signs in pregnancy and how serious each one is. The rules follow the
 * "sinais de alerta" of the Caderneta da Gestante (Ministério da Saúde): they
 * do not diagnose, they decide whether the health unit must be told.
 */
export const RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const SYMPTOM_CODES = [
  'BLEEDING',
  'FLUID_LOSS',
  'REDUCED_FETAL_MOVEMENT',
  'SEVERE_HEADACHE',
  'BLURRED_VISION',
  'CONTRACTIONS',
  'FEVER',
  'SUDDEN_SWELLING',
  'BURNING_URINATION',
  'NAUSEA',
  'HEARTBURN',
  'BACK_PAIN',
] as const;
export type SymptomCode = (typeof SYMPTOM_CODES)[number];

export interface SymptomInfo {
  label: string;
  description: string;
  baseRisk: RiskLevel;
}

export const SYMPTOMS: Record<SymptomCode, SymptomInfo> = {
  BLEEDING: {
    label: 'Sangramento',
    description: 'Qualquer sangue saindo pela vagina, mesmo pouco.',
    baseRisk: 'HIGH',
  },
  FLUID_LOSS: {
    label: 'Perda de líquido',
    description: 'Líquido escorrendo pela vagina, como se a bolsa tivesse rompido.',
    baseRisk: 'HIGH',
  },
  REDUCED_FETAL_MOVEMENT: {
    label: 'Bebê mexendo menos',
    description: 'O bebê está se mexendo bem menos que o normal ou parou de mexer.',
    baseRisk: 'HIGH',
  },
  SEVERE_HEADACHE: {
    label: 'Dor de cabeça forte',
    description: 'Dor de cabeça intensa que não passa com descanso.',
    baseRisk: 'MODERATE',
  },
  BLURRED_VISION: {
    label: 'Visão embaçada',
    description: 'Vista turva, pontos brilhantes ou "estrelinhas" na visão.',
    baseRisk: 'MODERATE',
  },
  CONTRACTIONS: {
    label: 'Contrações',
    description: 'Barriga endurecendo com dor, em intervalos regulares.',
    baseRisk: 'MODERATE',
  },
  FEVER: {
    label: 'Febre',
    description: 'Temperatura igual ou acima de 37,8 °C.',
    baseRisk: 'MODERATE',
  },
  SUDDEN_SWELLING: {
    label: 'Inchaço repentino',
    description: 'Rosto, mãos ou pernas inchando de uma hora para outra.',
    baseRisk: 'MODERATE',
  },
  BURNING_URINATION: {
    label: 'Ardência ao urinar',
    description: 'Dor ou ardor para fazer xixi, vontade de urinar toda hora.',
    baseRisk: 'MODERATE',
  },
  NAUSEA: {
    label: 'Enjoo',
    description: 'Enjoo ou vômito leve, comum no começo da gestação.',
    baseRisk: 'LOW',
  },
  HEARTBURN: {
    label: 'Azia',
    description: 'Queimação no estômago ou no peito depois de comer.',
    baseRisk: 'LOW',
  },
  BACK_PAIN: {
    label: 'Dor nas costas',
    description: 'Dor na lombar que melhora com repouso.',
    baseRisk: 'LOW',
  },
};

export interface SymptomReportInput {
  symptoms: SymptomCode[];
  systolic?: number | undefined;
  diastolic?: number | undefined;
  temperatureCelsius?: number | undefined;
  gestationalWeeks: number;
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
  notifyHealthUnit: boolean;
  guidance: string;
}

interface Finding {
  level: RiskLevel;
  reason: string;
}

const RANK: Record<RiskLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2 };

export function maxRisk(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((acc, lvl) => (RANK[lvl] > RANK[acc] ? lvl : acc), 'LOW');
}

const PRETERM_LIMIT_WEEKS = 37;

function bloodPressureFindings(input: SymptomReportInput): Finding[] {
  const { systolic, diastolic } = input;
  if (systolic === undefined || diastolic === undefined) return [];
  if (systolic >= 160 || diastolic >= 110) {
    return [{ level: 'HIGH', reason: `Pressão muito alta (${systolic}/${diastolic} mmHg)` }];
  }
  if (systolic >= 140 || diastolic >= 90) {
    return [{ level: 'HIGH', reason: `Pressão alta na gestação (${systolic}/${diastolic} mmHg)` }];
  }
  return [];
}

function temperatureFindings(input: SymptomReportInput): Finding[] {
  const t = input.temperatureCelsius;
  if (t === undefined || t < 37.8) return [];
  return [{ level: t >= 39 ? 'HIGH' : 'MODERATE', reason: `Febre de ${t.toFixed(1)} °C` }];
}

function symptomFindings(input: SymptomReportInput): Finding[] {
  return input.symptoms.map((code) => {
    const info = SYMPTOMS[code];
    if (code === 'CONTRACTIONS' && input.gestationalWeeks < PRETERM_LIMIT_WEEKS) {
      return { level: 'HIGH', reason: 'Contrações antes de 37 semanas (risco de parto prematuro)' };
    }
    return { level: info.baseRisk, reason: info.label };
  });
}

/** Headache plus visual change, or either one with high pressure, suggests pre-eclampsia. */
function preEclampsiaFindings(input: SymptomReportInput): Finding[] {
  const has = (code: SymptomCode): boolean => input.symptoms.includes(code);
  const neuro = has('SEVERE_HEADACHE') || has('BLURRED_VISION');
  const highPressure = (input.systolic ?? 0) >= 140 || (input.diastolic ?? 0) >= 90;
  const bothNeuro = has('SEVERE_HEADACHE') && has('BLURRED_VISION');
  if (bothNeuro || (neuro && highPressure) || (highPressure && has('SUDDEN_SWELLING'))) {
    return [{ level: 'HIGH', reason: 'Sinais de pré-eclâmpsia' }];
  }
  return [];
}

const GUIDANCE: Record<RiskLevel, string> = {
  HIGH: 'Procure a maternidade ou a UBS agora. Sua equipe de saúde já foi avisada.',
  MODERATE: 'Sua UBS foi avisada e vai entrar em contato. Se piorar, procure atendimento.',
  LOW: 'Isso é comum na gestação. Fale sobre isso na próxima consulta.',
};

export function assessSymptomReport(input: SymptomReportInput): RiskAssessment {
  const findings = [
    ...preEclampsiaFindings(input),
    ...bloodPressureFindings(input),
    ...temperatureFindings(input),
    ...symptomFindings(input),
  ];
  const level = maxRisk(findings.map((f) => f.level));
  const reasons = [...new Set(findings.filter((f) => f.level !== 'LOW').map((f) => f.reason))];
  return {
    level,
    reasons: reasons.length > 0 ? reasons : findings.map((f) => f.reason),
    notifyHealthUnit: level !== 'LOW',
    guidance: GUIDANCE[level],
  };
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
};
