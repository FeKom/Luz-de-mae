import {
  estimatedDueDate,
  gestationalAge,
  maxRisk,
  parseIsoDate,
  prenatalAdherence,
  toIsoDate,
  trimesterOf,
  type Patient,
  type PatientSummary,
  type RiskLevel,
} from '@luz-de-mae/shared';

export function summarizePatient(
  patient: Patient,
  attendedVisits: number,
  openAlertPriorities: RiskLevel[],
  today: Date,
): PatientSummary {
  const lmp = parseIsoDate(patient.lastMenstrualPeriod);
  const age = gestationalAge(lmp, today);
  return {
    ...patient,
    gestationalAge: age,
    trimester: trimesterOf(age.weeks),
    dueDate: toIsoDate(estimatedDueDate(lmp)),
    adherence: prenatalAdherence(attendedVisits, age.weeks),
    openAlerts: openAlertPriorities.length,
    highestOpenPriority: openAlertPriorities.length > 0 ? maxRisk(openAlertPriorities) : null,
  };
}
