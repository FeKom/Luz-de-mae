import {
  APPOINTMENT_KIND_LABELS,
  type Alert,
  type Appointment,
  type Patient,
  type PrenatalAdherence,
  type RiskAssessment,
  type RiskLevel,
} from '@luz-de-mae/shared';
import type { alerts } from '../database/schema.js';

export type AlertRow = typeof alerts.$inferSelect;
export type AlertDraft = Omit<typeof alerts.$inferInsert, 'id'>;

const HOUR_MS = 3_600_000;

export function toAlert(row: AlertRow): Alert {
  const { appointmentId: _a, symptomReportId: _s, ...alert } = row;
  return alert;
}

function draft(
  patient: Patient,
  now: Date,
  fields: Pick<AlertDraft, 'type' | 'priority' | 'title' | 'details'> &
    Partial<Pick<AlertDraft, 'appointmentId' | 'symptomReportId'>>,
): AlertDraft {
  return {
    patientId: patient.id,
    healthUnitId: patient.healthUnitId,
    status: 'OPEN',
    createdAt: now.toISOString(),
    resolvedAt: null,
    resolutionNote: null,
    ...fields,
  };
}

export function symptomAlertDraft(
  patient: Patient,
  reportId: number,
  assessment: RiskAssessment,
  now: Date,
): AlertDraft | null {
  if (!assessment.notifyHealthUnit) return null;
  return draft(patient, now, {
    type: 'SYMPTOM_RISK',
    priority: assessment.level,
    title: assessment.level === 'HIGH' ? 'Sinal de alerta relatado' : 'Sintoma que pede atenção',
    details: assessment.reasons.join('; '),
    symptomReportId: reportId,
  });
}

/** A past appointment that nobody marked as attended or cancelled is treated as missed. */
export function isOverdue(appointment: Appointment, now: Date, graceHours: number): boolean {
  if (appointment.status !== 'SCHEDULED') return false;
  return new Date(appointment.scheduledAt).getTime() + graceHours * HOUR_MS < now.getTime();
}

export function missedAppointmentDraft(
  patient: Patient,
  appointment: Appointment,
  now: Date,
): AlertDraft {
  const priority: RiskLevel = patient.highRisk ? 'HIGH' : 'MODERATE';
  const when = new Date(appointment.scheduledAt).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
  return draft(patient, now, {
    type: 'MISSED_APPOINTMENT',
    priority,
    title: 'Faltou à consulta',
    details: `${APPOINTMENT_KIND_LABELS[appointment.kind]} de ${when} com ${appointment.professional}.`,
    appointmentId: appointment.id,
  });
}

export function latePrenatalDraft(
  patient: Patient,
  adherence: PrenatalAdherence,
  now: Date,
): AlertDraft | null {
  if (adherence.level !== 'INADEQUATE') return null;
  return draft(patient, now, {
    type: 'LATE_PRENATAL',
    priority: patient.highRisk ? 'HIGH' : 'MODERATE',
    title: 'Pré-natal atrasado',
    details: `${adherence.attended} de ${adherence.expected} consultas esperadas para a idade gestacional.`,
  });
}
