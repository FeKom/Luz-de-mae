import { computeIndicators, parseTabnetCsv, type IndicatorSources } from './indicators.js';

const csv = (rows: string[]): string => ['linha,coluna,valor', ...rows].join('\n');

const sources: IndicatorSources = {
  fetalDeathsByStateYear: parseTabnetCsv(
    csv(['35 São Paulo,2023,10', '35 São Paulo,2024,20', '12 Acre,2024,5', 'Total,2023,10', 'Total,2024,25']),
  ),
  liveBirthsByStateYear: parseTabnetCsv(csv(['35 São Paulo,2024,1980', '12 Acre,2024,95'])),
  fetalDeathsByStateTiming: parseTabnetCsv(csv(['Total,Antes do parto,90', 'Total,Total,100'])),
  liveBirthsVisitsByApgar: parseTabnetCsv(
    csv(['Nenhuma,0 a 2,5', 'Nenhuma,6 a 7,5', 'Nenhuma,Ignorado,10', 'Nenhuma,Total,110']),
  ),
  liveBirthsVisitsByYear: parseTabnetCsv(
    csv(['Nenhuma,2024,10', 'De 4 a 6 consultas,2024,20', '7 ou mais consultas,2024,70', 'Total,2024,100']),
  ),
};

describe('parseTabnetCsv', () => {
  it('keeps commas inside quoted fields', () => {
    const [cellRow] = parseTabnetCsv(csv(['11 Rondônia,"Óbito investigado, com ficha",1995']));
    expect(cellRow).toEqual({ row: '11 Rondônia', column: 'Óbito investigado, com ficha', value: 1995 });
  });
});

describe('computeIndicators', () => {
  const result = computeIndicators(sources);

  it('reads the national yearly series from the Total row', () => {
    expect(result.fetalDeathsByYear).toEqual([
      { label: '2023', value: 10 },
      { label: '2024', value: 25 },
    ]);
  });

  it('computes fetal mortality per 1,000 births and ranks states', () => {
    expect(result.fetalMortalityByState[0]).toEqual({ label: 'Acre', value: 50 });
    expect(result.fetalMortalityByState[1]?.value).toBeCloseTo(10);
  });

  it('excludes unknown Apgar from the low-Apgar share', () => {
    expect(result.lowApgarByVisits[0]?.value).toBeCloseTo(0.1);
  });

  it('counts fewer than 7 visits as insufficient prenatal care', () => {
    expect(result.insufficientPrenatalByYear).toEqual([{ label: '2024', value: 0.3 }]);
    expect(result.antepartumShare).toBeCloseTo(0.9);
  });
});
