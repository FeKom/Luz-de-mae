import { parseIsoDate, toIsoDate } from './dates.js';
import { estimatedDueDate, gestationalAge, trimesterOf } from './gestation.js';

describe('gestation', () => {
  it('counts weeks and days from the last menstrual period', () => {
    const age = gestationalAge(parseIsoDate('2026-01-01'), parseIsoDate('2026-03-05'));
    expect(age).toEqual({ weeks: 9, days: 0 });
  });

  it('applies Naegele rule for the due date', () => {
    expect(toIsoDate(estimatedDueDate(parseIsoDate('2026-01-01')))).toBe('2026-10-08');
  });

  it.each([
    [13, 1],
    [14, 2],
    [27, 2],
    [28, 3],
  ])('week %i is trimester %i', (week, trimester) => {
    expect(trimesterOf(week)).toBe(trimester);
  });
});
