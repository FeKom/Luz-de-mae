import type { Indicators, SeriesPoint } from '@luz-de-mae/shared';

/** One cell of a TabNet table, as saved by data/scripts/extract_tabnet.py. */
export interface TabnetCell {
  row: string;
  column: string;
  value: number;
}

export type TabnetTable = TabnetCell[];

export interface IndicatorSources {
  fetalDeathsByStateYear: TabnetTable;
  liveBirthsByStateYear: TabnetTable;
  fetalDeathsByStateTiming: TabnetTable;
  liveBirthsVisitsByApgar: TabnetTable;
  liveBirthsVisitsByYear: TabnetTable;
}

const TOTAL = 'Total';
const UNKNOWN = 'Ignorado';
const VISIT_ROWS = ['Nenhuma', 'De 1 a 3 consultas', 'De 4 a 6 consultas', '7 ou mais consultas'];
const LOW_APGAR = ['0 a 2', '3 a 5', '6 a 7'];

/** Minimal RFC 4180 reader: the files only quote fields that contain commas. */
export function parseTabnetCsv(text: string): TabnetTable {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  return lines.slice(1).map((line) => {
    const fields: string[] = [];
    let current = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        fields.push(current);
        current = '';
      } else current += char;
    }
    fields.push(current);
    const [row = '', column = '', value = '0'] = fields;
    return { row, column, value: Number(value) };
  });
}

function cell(table: TabnetTable, row: string, column: string): number {
  return table.find((c) => c.row === row && c.column === column)?.value ?? 0;
}

function yearsOf(table: TabnetTable): string[] {
  return [...new Set(table.map((c) => c.column))].filter((c) => /^\d{4}$/.test(c)).sort();
}

const ratio = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole);

/** "35 São Paulo" -> "São Paulo". */
const stateName = (row: string): string => row.replace(/^\d+\s+/, '');

export function computeIndicators(sources: IndicatorSources): Indicators {
  const years = yearsOf(sources.fetalDeathsByStateYear);
  const latest = years.at(-1) ?? '';

  const fetalDeathsByYear: SeriesPoint[] = years.map((year) => ({
    label: year,
    value: cell(sources.fetalDeathsByStateYear, TOTAL, year),
  }));

  const timing = sources.fetalDeathsByStateTiming;
  const antepartumShare = ratio(cell(timing, TOTAL, 'Antes do parto'), cell(timing, TOTAL, TOTAL));

  const apgar = sources.liveBirthsVisitsByApgar;
  const lowApgarByVisits: SeriesPoint[] = VISIT_ROWS.map((row) => {
    const known = cell(apgar, row, TOTAL) - cell(apgar, row, UNKNOWN);
    const low = LOW_APGAR.reduce((sum, col) => sum + cell(apgar, row, col), 0);
    return { label: row, value: ratio(low, known) };
  });

  const visits = sources.liveBirthsVisitsByYear;
  const insufficientPrenatalByYear: SeriesPoint[] = yearsOf(visits).map((year) => {
    const known = cell(visits, TOTAL, year) - cell(visits, UNKNOWN, year);
    const insufficient = VISIT_ROWS.slice(0, 3).reduce((sum, row) => sum + cell(visits, row, year), 0);
    return { label: year, value: ratio(insufficient, known) };
  });

  const states = [...new Set(sources.fetalDeathsByStateYear.map((c) => c.row))].filter((r) => r !== TOTAL);
  const fetalMortalityByState: SeriesPoint[] = states
    .map((row) => {
      const deaths = cell(sources.fetalDeathsByStateYear, row, latest);
      const births = cell(sources.liveBirthsByStateYear, row, latest);
      return { label: stateName(row), value: ratio(deaths, deaths + births) * 1000 };
    })
    .sort((a, b) => b.value - a.value);

  return {
    period: { from: Number(years[0] ?? 0), to: Number(latest) },
    fetalDeathsByYear,
    antepartumShare,
    lowApgarByVisits,
    insufficientPrenatalByYear,
    fetalMortalityByState,
  };
}
