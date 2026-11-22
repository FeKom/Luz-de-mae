import type { CareItem } from './care-guide.js';
import type { IsoDate } from './dates.js';
import type { GestationalAge, Trimester } from './gestation.js';
import type { PrenatalAdherence } from './prenatal.js';
import type { RiskLevel, SymptomCode } from './risk.js';

export const APPOINTMENT_KINDS = ['PRENATAL', 'EXAM', 'ULTRASOUND', 'VACCINE'] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const APPOINTMENT_STATUSES = ['SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const ALERT_TYPES = ['SYMPTOM_RISK', 'MISSED_APPOINTMENT', 'LATE_PRENATAL'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_STATUSES = ['OPEN', 'IN_FOLLOW_UP', 'RESOLVED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export interface HealthUnit {
  id: number;
  name: string;
  neighborhood: string;
  city: string;
  phone: string;
}

export interface Patient {
  id: number;
  name: string;
  birthDate: IsoDate;
  phone: string;
  lastMenstrualPeriod: IsoDate;
  firstPregnancy: boolean;
  highRisk: boolean;
  communityAgent: string;
  healthUnitId: number;
}

export interface Appointment {
  id: number;
  patientId: number;
  kind: AppointmentKind;
  /** ISO 8601 date-time. */
  scheduledAt: string;
  professional: string;
  status: AppointmentStatus;
  notes: string | null;
}

export interface SymptomReport {
  id: number;
  patientId: number;
  reportedAt: string;
  symptoms: SymptomCode[];
  systolic: number | null;
  diastolic: number | null;
  temperatureCelsius: number | null;
  notes: string | null;
  riskLevel: RiskLevel;
  reasons: string[];
}

export interface Alert {
  id: number;
  patientId: number;
  healthUnitId: number;
  type: AlertType;
  priority: RiskLevel;
  status: AlertStatus;
  title: string;
  details: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface AlertView extends Alert {
  patientName: string;
  patientPhone: string;
  communityAgent: string;
}

export interface PatientSummary extends Patient {
  gestationalAge: GestationalAge;
  trimester: Trimester;
  dueDate: IsoDate;
  adherence: PrenatalAdherence;
  openAlerts: number;
  highestOpenPriority: RiskLevel | null;
}

export interface CareItemStatus extends CareItem {
  done: boolean;
}

export interface PatientDetail extends PatientSummary {
  healthUnit: HealthUnit;
  nextAppointment: Appointment | null;
  careItems: CareItemStatus[];
}

export interface SymptomReportResult {
  report: SymptomReport;
  alert: Alert | null;
  guidance: string;
}

export interface HealthUnitDashboard {
  healthUnit: HealthUnit;
  stats: {
    patients: number;
    openAlerts: number;
    highPriorityAlerts: number;
    inadequatePrenatal: number;
  };
  alerts: AlertView[];
  patients: PatientSummary[];
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface Indicators {
  period: { from: number; to: number };
  fetalDeathsByYear: SeriesPoint[];
  /** Share of fetal deaths that happen before labour, when prenatal care can still act. */
  antepartumShare: number;
  /** Share of live births with a 5-minute Apgar below 8, per number of prenatal visits. */
  lowApgarByVisits: SeriesPoint[];
  /** Share of live births with fewer than 7 prenatal visits, per year. */
  insufficientPrenatalByYear: SeriesPoint[];
  /** Fetal deaths per 1,000 births (live + fetal deaths), per state, latest year. */
  fetalMortalityByState: SeriesPoint[];
}

export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  PRENATAL: 'Consulta de pré-natal',
  EXAM: 'Exames de laboratório',
  ULTRASOUND: 'Ultrassom',
  VACCINE: 'Vacina',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendada',
  ATTENDED: 'Realizada',
  MISSED: 'Falta',
  CANCELLED: 'Cancelada',
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  SYMPTOM_RISK: 'Sintoma de risco',
  MISSED_APPOINTMENT: 'Falta em consulta',
  LATE_PRENATAL: 'Pré-natal atrasado',
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: 'Aberto',
  IN_FOLLOW_UP: 'Em busca ativa',
  RESOLVED: 'Resolvido',
};
