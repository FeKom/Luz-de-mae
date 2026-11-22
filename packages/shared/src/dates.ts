const DAY_MS = 86_400_000;

/** Calendar date in `YYYY-MM-DD` form. Days are counted in UTC to avoid DST drift. */
export type IsoDate = string;

export function parseIsoDate(value: IsoDate): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`invalid ISO date: ${value}`);
  }
  return parsed;
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / DAY_MS);
}
