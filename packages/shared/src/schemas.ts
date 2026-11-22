import { z } from 'zod';
import { ALERT_STATUSES, APPOINTMENT_KINDS, APPOINTMENT_STATUSES } from './domain.js';
import { SYMPTOM_CODES } from './risk.js';

/** Request bodies, validated by Nest on the server and reused by the web forms. */
export const symptomReportSchema = z
  .object({
    symptoms: z.array(z.enum(SYMPTOM_CODES)).max(SYMPTOM_CODES.length),
    systolic: z.number().int().min(60).max(260).optional(),
    diastolic: z.number().int().min(30).max(180).optional(),
    temperatureCelsius: z.number().min(34).max(43).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => (v.systolic === undefined) === (v.diastolic === undefined), {
    message: 'Informe os dois valores da pressão (ex.: 120 por 80).',
    path: ['diastolic'],
  })
  .refine(
    (v) =>
      v.symptoms.length > 0 ||
      v.systolic !== undefined ||
      v.temperatureCelsius !== undefined,
    { message: 'Marque um sintoma ou informe a pressão ou a temperatura.', path: ['symptoms'] },
  );
export type SymptomReportBody = z.infer<typeof symptomReportSchema>;

export const createAppointmentSchema = z.object({
  kind: z.enum(APPOINTMENT_KINDS),
  scheduledAt: z.iso.datetime({ offset: true }),
  professional: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).optional(),
});
export type CreateAppointmentBody = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});
export type UpdateAppointmentBody = z.infer<typeof updateAppointmentSchema>;

export const updateAlertSchema = z.object({
  status: z.enum(ALERT_STATUSES),
  resolutionNote: z.string().trim().max(500).optional(),
});
export type UpdateAlertBody = z.infer<typeof updateAlertSchema>;

export const careItemToggleSchema = z.object({ done: z.boolean() });
export type CareItemToggleBody = z.infer<typeof careItemToggleSchema>;

export const idParamSchema = z.coerce.number().int().positive();
