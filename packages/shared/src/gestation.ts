import { addDays, daysBetween } from './dates.js';

/** Naegele's rule: a full-term pregnancy lasts 280 days from the last menstrual period. */
export const FULL_TERM_DAYS = 280;

export type Trimester = 1 | 2 | 3;

export interface GestationalAge {
  weeks: number;
  days: number;
}

export function gestationalAge(lastMenstrualPeriod: Date, today: Date): GestationalAge {
  const elapsed = Math.max(0, daysBetween(lastMenstrualPeriod, today));
  return { weeks: Math.floor(elapsed / 7), days: elapsed % 7 };
}

/** Brazilian Ministry of Health split: 1st up to 13w6d, 2nd up to 27w6d, 3rd from 28w. */
export function trimesterOf(weeks: number): Trimester {
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

export function estimatedDueDate(lastMenstrualPeriod: Date): Date {
  return addDays(lastMenstrualPeriod, FULL_TERM_DAYS);
}
