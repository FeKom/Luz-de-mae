import type { Appointment, Patient } from '@luz-de-mae/shared';
import { isOverdue, latePrenatalDraft, missedAppointmentDraft } from './alert-rules.js';

const patient: Patient = {
  id: 1,
  name: 'Gestante Teste',
  birthDate: '2000-01-01',
  phone: '(11) 90000-0000',
  lastMenstrualPeriod: '2026-05-01',
  firstPregnancy: true,
  highRisk: false,
  communityAgent: 'ACS Teste',
  healthUnitId: 7,
};

const appointment: Appointment = {
  id: 10,
  patientId: 1,
  kind: 'PRENATAL',
  scheduledAt: '2026-11-20T12:00:00.000Z',
  professional: 'Enf. Teste',
  status: 'SCHEDULED',
  notes: null,
};

describe('isOverdue', () => {
  const now = new Date('2026-11-20T15:00:00.000Z');

  it('flags a scheduled appointment past the grace period', () => {
    expect(isOverdue(appointment, now, 2)).toBe(true);
  });

  it('waits for the grace period to end', () => {
    expect(isOverdue(appointment, now, 4)).toBe(false);
  });

  it('ignores appointments already attended', () => {
    expect(isOverdue({ ...appointment, status: 'ATTENDED' }, now, 2)).toBe(false);
  });
});

describe('alert drafts', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');

  it('routes a missed appointment to the patient health unit', () => {
    const draft = missedAppointmentDraft(patient, appointment, now);
    expect(draft).toMatchObject({ healthUnitId: 7, appointmentId: 10, priority: 'MODERATE' });
  });

  it('raises priority when the pregnancy is high risk', () => {
    const draft = missedAppointmentDraft({ ...patient, highRisk: true }, appointment, now);
    expect(draft.priority).toBe('HIGH');
  });

  it('only alerts late prenatal care when adherence is inadequate', () => {
    expect(latePrenatalDraft(patient, { attended: 4, expected: 5, level: 'ATTENTION' }, now)).toBeNull();
    expect(latePrenatalDraft(patient, { attended: 1, expected: 5, level: 'INADEQUATE' }, now)).not.toBeNull();
  });
});
