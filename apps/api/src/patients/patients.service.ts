import {
  CARE_ITEMS,
  type CareItemStatus,
  type Patient,
  type PatientDetail,
  type PatientSummary,
  type RiskLevel,
} from '@luz-de-mae/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, eq, gte, inArray, ne } from 'drizzle-orm';
import type { Database } from '../database/database.js';
import { alerts, appointments, careChecks, healthUnits, patients } from '../database/schema.js';
import { summarizePatient } from './patient-summary.js';

@Injectable()
export class PatientsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  find(id: number): Patient {
    const patient = this.db.select().from(patients).where(eq(patients.id, id)).get();
    if (patient === undefined) throw new NotFoundException(`Gestante ${id} não encontrada`);
    return patient;
  }

  summaries(healthUnitId?: number, today: Date = new Date()): PatientSummary[] {
    const rows = this.db
      .select()
      .from(patients)
      .where(healthUnitId === undefined ? undefined : eq(patients.healthUnitId, healthUnitId))
      .orderBy(asc(patients.name))
      .all();
    const ids = rows.map((p) => p.id);
    if (ids.length === 0) return [];

    const attended = new Map(
      this.db
        .select({ patientId: appointments.patientId, total: count() })
        .from(appointments)
        .where(and(inArray(appointments.patientId, ids), eq(appointments.status, 'ATTENDED')))
        .groupBy(appointments.patientId)
        .all()
        .map((r) => [r.patientId, r.total]),
    );
    const openAlerts = this.db
      .select({ patientId: alerts.patientId, priority: alerts.priority })
      .from(alerts)
      .where(and(inArray(alerts.patientId, ids), ne(alerts.status, 'RESOLVED')))
      .all();
    const prioritiesOf = (id: number): RiskLevel[] =>
      openAlerts.filter((a) => a.patientId === id).map((a) => a.priority);

    return rows.map((p) => summarizePatient(p, attended.get(p.id) ?? 0, prioritiesOf(p.id), today));
  }

  summary(id: number): PatientSummary {
    const patient = this.find(id);
    const found = this.summaries(patient.healthUnitId).find((s) => s.id === id);
    if (found === undefined) throw new NotFoundException(`Gestante ${id} não encontrada`);
    return found;
  }

  detail(id: number): PatientDetail {
    const summary = this.summary(id);
    const healthUnit = this.db
      .select()
      .from(healthUnits)
      .where(eq(healthUnits.id, summary.healthUnitId))
      .get();
    if (healthUnit === undefined) throw new NotFoundException('UBS da gestante não encontrada');
    const nextAppointment =
      this.db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, id),
            eq(appointments.status, 'SCHEDULED'),
            gte(appointments.scheduledAt, new Date().toISOString()),
          ),
        )
        .orderBy(asc(appointments.scheduledAt))
        .get() ?? null;
    return { ...summary, healthUnit, nextAppointment, careItems: this.careItems(id) };
  }

  careItems(patientId: number): CareItemStatus[] {
    const done = new Set(
      this.db
        .select({ itemId: careChecks.itemId })
        .from(careChecks)
        .where(eq(careChecks.patientId, patientId))
        .all()
        .map((r) => r.itemId),
    );
    return CARE_ITEMS.map((item) => ({ ...item, done: done.has(item.id) }));
  }

  setCareItem(patientId: number, itemId: string, isDone: boolean): CareItemStatus[] {
    this.find(patientId);
    if (!CARE_ITEMS.some((item) => item.id === itemId)) {
      throw new NotFoundException(`Item da caderneta ${itemId} não existe`);
    }
    const key = and(eq(careChecks.patientId, patientId), eq(careChecks.itemId, itemId));
    if (isDone) {
      this.db
        .insert(careChecks)
        .values({ patientId, itemId, doneAt: new Date().toISOString() })
        .onConflictDoNothing()
        .run();
    } else {
      this.db.delete(careChecks).where(key).run();
    }
    return this.careItems(patientId);
  }
}
