import { assessSymptomReport, type SymptomReportInput } from './risk.js';

const base: SymptomReportInput = { symptoms: [], gestationalWeeks: 30 };

describe('assessSymptomReport', () => {
  it('keeps common discomforts low and does not notify the unit', () => {
    const result = assessSymptomReport({ ...base, symptoms: ['NAUSEA', 'BACK_PAIN'] });
    expect(result.level).toBe('LOW');
    expect(result.notifyHealthUnit).toBe(false);
  });

  it('flags blood pressure of 140/90 as high risk', () => {
    const result = assessSymptomReport({ ...base, systolic: 140, diastolic: 90 });
    expect(result.level).toBe('HIGH');
    expect(result.reasons[0]).toContain('140/90');
  });

  it('does not flag normal blood pressure', () => {
    const result = assessSymptomReport({ ...base, systolic: 118, diastolic: 76 });
    expect(result.level).toBe('LOW');
  });

  it('escalates headache with blurred vision to pre-eclampsia', () => {
    const result = assessSymptomReport({
      ...base,
      symptoms: ['SEVERE_HEADACHE', 'BLURRED_VISION'],
    });
    expect(result.level).toBe('HIGH');
    expect(result.reasons).toContain('Sinais de pré-eclâmpsia');
  });

  it('treats contractions before 37 weeks as preterm labour risk', () => {
    const preterm = assessSymptomReport({ ...base, symptoms: ['CONTRACTIONS'] });
    const term = assessSymptomReport({ symptoms: ['CONTRACTIONS'], gestationalWeeks: 38 });
    expect(preterm.level).toBe('HIGH');
    expect(term.level).toBe('MODERATE');
  });

  it('notifies the unit on moderate fever', () => {
    const result = assessSymptomReport({ ...base, temperatureCelsius: 38.2 });
    expect(result.level).toBe('MODERATE');
    expect(result.notifyHealthUnit).toBe(true);
  });
});
