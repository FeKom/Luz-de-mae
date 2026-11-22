import {
  ALERT_STATUSES,
  ALERT_TYPES,
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  RISK_LEVELS,
  type SymptomCode,
} from '@luz-de-mae/shared';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const healthUnits = sqliteTable('health_units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull(),
  phone: text('phone').notNull(),
});

export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  birthDate: text('birth_date').notNull(),
  phone: text('phone').notNull(),
  lastMenstrualPeriod: text('last_menstrual_period').notNull(),
  firstPregnancy: integer('first_pregnancy', { mode: 'boolean' }).notNull(),
  highRisk: integer('high_risk', { mode: 'boolean' }).notNull(),
  communityAgent: text('community_agent').notNull(),
  healthUnitId: integer('health_unit_id')
    .notNull()
    .references(() => healthUnits.id),
});

export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  kind: text('kind', { enum: APPOINTMENT_KINDS }).notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  professional: text('professional').notNull(),
  status: text('status', { enum: APPOINTMENT_STATUSES }).notNull(),
  notes: text('notes'),
});

export const symptomReports = sqliteTable('symptom_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  reportedAt: text('reported_at').notNull(),
  symptoms: text('symptoms', { mode: 'json' }).$type<SymptomCode[]>().notNull(),
  systolic: integer('systolic'),
  diastolic: integer('diastolic'),
  temperatureCelsius: real('temperature_celsius'),
  notes: text('notes'),
  riskLevel: text('risk_level', { enum: RISK_LEVELS }).notNull(),
  reasons: text('reasons', { mode: 'json' }).$type<string[]>().notNull(),
});

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  healthUnitId: integer('health_unit_id')
    .notNull()
    .references(() => healthUnits.id),
  type: text('type', { enum: ALERT_TYPES }).notNull(),
  priority: text('priority', { enum: RISK_LEVELS }).notNull(),
  status: text('status', { enum: ALERT_STATUSES }).notNull(),
  title: text('title').notNull(),
  details: text('details').notNull(),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
  resolutionNote: text('resolution_note'),
  /** Source records, so the scan job never alerts twice for the same fact. */
  appointmentId: integer('appointment_id').references(() => appointments.id),
  symptomReportId: integer('symptom_report_id').references(() => symptomReports.id),
});

export const careChecks = sqliteTable(
  'care_checks',
  {
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
    itemId: text('item_id').notNull(),
    doneAt: text('done_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.patientId, t.itemId] })],
);

export const schema = {
  healthUnits,
  patients,
  appointments,
  symptomReports,
  alerts,
  careChecks,
};
