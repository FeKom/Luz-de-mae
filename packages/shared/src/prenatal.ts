/**
 * Prenatal schedule from the Brazilian Ministry of Health: first visit by
 * week 12, then monthly until week 28, every two weeks until 36 and weekly
 * after that. SINASC treats 7 or more visits as adequate.
 */
export const FIRST_VISIT_DEADLINE_WEEK = 12;
export const MINIMUM_ADEQUATE_VISITS = 7;

export const ADHERENCE_LEVELS = ['ADEQUATE', 'ATTENTION', 'INADEQUATE'] as const;
export type AdherenceLevel = (typeof ADHERENCE_LEVELS)[number];

export interface PrenatalAdherence {
  attended: number;
  expected: number;
  level: AdherenceLevel;
}

export function expectedVisitsByWeek(weeks: number): number {
  if (weeks < FIRST_VISIT_DEADLINE_WEEK) return 0;
  const monthly = 1 + Math.floor((Math.min(weeks, 28) - FIRST_VISIT_DEADLINE_WEEK) / 4);
  const biweekly = weeks > 28 ? Math.floor((Math.min(weeks, 36) - 28) / 2) : 0;
  const weekly = weeks > 36 ? weeks - 36 : 0;
  return monthly + biweekly + weekly;
}

export function nextVisitIntervalDays(weeks: number): number {
  if (weeks < 28) return 28;
  if (weeks < 36) return 14;
  return 7;
}

/** One missing visit is tolerated as "attention" before it counts as inadequate. */
export function prenatalAdherence(attended: number, weeks: number): PrenatalAdherence {
  const expected = expectedVisitsByWeek(weeks);
  const gap = expected - attended;
  const level: AdherenceLevel = gap <= 0 ? 'ADEQUATE' : gap === 1 ? 'ATTENTION' : 'INADEQUATE';
  return { attended, expected, level };
}

export const ADHERENCE_LABELS: Record<AdherenceLevel, string> = {
  ADEQUATE: 'Em dia',
  ATTENTION: 'Atenção',
  INADEQUATE: 'Atrasado',
};
