import { expectedVisitsByWeek, prenatalAdherence } from './prenatal.js';

describe('expectedVisitsByWeek', () => {
  it.each([
    [8, 0],
    [12, 1],
    [20, 3],
    [28, 5],
    [32, 7],
    [36, 9],
    [39, 12],
  ])('week %i expects %i visits', (week, visits) => {
    expect(expectedVisitsByWeek(week)).toBe(visits);
  });
});

describe('prenatalAdherence', () => {
  it('tolerates one missing visit as attention', () => {
    expect(prenatalAdherence(4, 28).level).toBe('ATTENTION');
  });

  it('marks two or more missing visits as inadequate', () => {
    expect(prenatalAdherence(2, 28).level).toBe('INADEQUATE');
  });

  it('is adequate when attended visits meet the schedule', () => {
    expect(prenatalAdherence(5, 28).level).toBe('ADEQUATE');
  });
});
