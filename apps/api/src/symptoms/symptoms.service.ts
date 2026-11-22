import {
  assessSymptomReport,
  type SymptomReport,
  type SymptomReportBody,
  type SymptomReportResult,
} from '@luz-de-mae/shared';
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { desc, eq } from 'drizzle-orm';
import { symptomAlertDraft } from '../alerts/alert-rules.js';
import { AlertsService } from '../alerts/alerts.service.js';
import type { Database } from '../database/database.js';
import { symptomReports } from '../database/schema.js';
import { PatientsService } from '../patients/patients.service.js';

@Injectable()
export class SymptomsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly patients: PatientsService,
    private readonly alerts: AlertsService,
  ) {}

  listForPatient(patientId: number): SymptomReport[] {
    this.patients.find(patientId);
    return this.db
      .select()
      .from(symptomReports)
      .where(eq(symptomReports.patientId, patientId))
      .orderBy(desc(symptomReports.reportedAt))
      .all();
  }

  report(patientId: number, body: SymptomReportBody): SymptomReportResult {
    const patient = this.patients.summary(patientId);
    const assessment = assessSymptomReport({
      ...body,
      gestationalWeeks: patient.gestationalAge.weeks,
    });
    const now = new Date();
    const report = this.db
      .insert(symptomReports)
      .values({
        patientId,
        reportedAt: now.toISOString(),
        symptoms: body.symptoms,
        systolic: body.systolic ?? null,
        diastolic: body.diastolic ?? null,
        temperatureCelsius: body.temperatureCelsius ?? null,
        notes: body.notes ?? null,
        riskLevel: assessment.level,
        reasons: assessment.reasons,
      })
      .returning()
      .get();
    const draft = symptomAlertDraft(patient, report.id, assessment, now);
    const alert = draft === null ? null : this.alerts.create(draft);
    return { report, alert, guidance: assessment.guidance };
  }
}
