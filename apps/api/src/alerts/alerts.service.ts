import type { Alert, AlertStatus, AlertView, UpdateAlertBody } from '@luz-de-mae/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, desc, eq, ne, type SQL } from 'drizzle-orm';
import { config } from '../config.js';
import type { Database } from '../database/database.js';
import { alerts, appointments, patients } from '../database/schema.js';
import { PatientsService } from '../patients/patients.service.js';
import {
  isOverdue,
  latePrenatalDraft,
  missedAppointmentDraft,
  toAlert,
  type AlertDraft,
} from './alert-rules.js';

export interface AlertFilter {
  healthUnitId?: number | undefined;
  patientId?: number | undefined;
  status?: AlertStatus | undefined;
}

export interface ScanResult {
  missedAppointments: number;
  latePrenatal: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly patients: PatientsService,
  ) {}

  create(draft: AlertDraft): Alert {
    const row = this.db.insert(alerts).values(draft).returning().get();
    this.logger.log(`Alerta ${row.id} (${row.type}, ${row.priority}) para a UBS ${row.healthUnitId}`);
    return toAlert(row);
  }

  list(filter: AlertFilter): AlertView[] {
    const conditions: SQL[] = [];
    if (filter.healthUnitId !== undefined) conditions.push(eq(alerts.healthUnitId, filter.healthUnitId));
    if (filter.patientId !== undefined) conditions.push(eq(alerts.patientId, filter.patientId));
    if (filter.status !== undefined) conditions.push(eq(alerts.status, filter.status));
    return this.db
      .select({
        alert: alerts,
        patientName: patients.name,
        patientPhone: patients.phone,
        communityAgent: patients.communityAgent,
      })
      .from(alerts)
      .innerJoin(patients, eq(alerts.patientId, patients.id))
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .all()
      .map(({ alert, ...who }) => ({ ...toAlert(alert), ...who }));
  }

  update(id: number, body: UpdateAlertBody): Alert {
    const resolved = body.status === 'RESOLVED';
    const row = this.db
      .update(alerts)
      .set({
        status: body.status,
        resolutionNote: body.resolutionNote ?? null,
        resolvedAt: resolved ? new Date().toISOString() : null,
      })
      .where(eq(alerts.id, id))
      .returning()
      .get();
    if (row === undefined) throw new NotFoundException(`Alerta ${id} não encontrado`);
    return toAlert(row);
  }

  /**
   * Active search ("busca ativa"): marks overdue appointments as missed and
   * raises late-prenatal alerts. Safe to run repeatedly: it never duplicates.
   */
  scan(now: Date = new Date()): ScanResult {
    const overdue = this.db
      .select()
      .from(appointments)
      .where(eq(appointments.status, 'SCHEDULED'))
      .all()
      .filter((a) => isOverdue(a, now, config.missedAppointmentGraceHours));
    for (const appointment of overdue) {
      this.db.update(appointments).set({ status: 'MISSED' }).where(eq(appointments.id, appointment.id)).run();
      this.alertMissedAppointment(appointment.id, now);
    }

    const pending = new Set(
      this.db
        .select({ patientId: alerts.patientId })
        .from(alerts)
        .where(and(eq(alerts.type, 'LATE_PRENATAL'), ne(alerts.status, 'RESOLVED')))
        .all()
        .map((r) => r.patientId),
    );
    const late = this.patients
      .summaries(undefined, now)
      .filter((p) => !pending.has(p.id))
      .map((p) => latePrenatalDraft(p, p.adherence, now))
      .filter((d): d is AlertDraft => d !== null);
    late.forEach((d) => this.create(d));

    return { missedAppointments: overdue.length, latePrenatal: late.length };
  }

  /** Creates the missed-appointment alert unless one already exists for it. */
  alertMissedAppointment(appointmentId: number, now: Date = new Date()): Alert | null {
    const existing = this.db
      .select({ id: alerts.id })
      .from(alerts)
      .where(eq(alerts.appointmentId, appointmentId))
      .get();
    if (existing !== undefined) return null;
    const appointment = this.db.select().from(appointments).where(eq(appointments.id, appointmentId)).get();
    if (appointment === undefined) throw new NotFoundException(`Consulta ${appointmentId} não encontrada`);
    const patient = this.patients.find(appointment.patientId);
    return this.create(missedAppointmentDraft(patient, appointment, now));
  }
}
