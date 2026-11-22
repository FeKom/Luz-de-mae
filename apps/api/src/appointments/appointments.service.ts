import type { Appointment, CreateAppointmentBody, UpdateAppointmentBody } from '@luz-de-mae/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { desc, eq } from 'drizzle-orm';
import { AlertsService } from '../alerts/alerts.service.js';
import type { Database } from '../database/database.js';
import { appointments } from '../database/schema.js';
import { PatientsService } from '../patients/patients.service.js';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly patients: PatientsService,
    private readonly alerts: AlertsService,
  ) {}

  listForPatient(patientId: number): Appointment[] {
    this.patients.find(patientId);
    return this.db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.scheduledAt))
      .all();
  }

  create(patientId: number, body: CreateAppointmentBody): Appointment {
    this.patients.find(patientId);
    return this.db
      .insert(appointments)
      .values({
        patientId,
        kind: body.kind,
        scheduledAt: new Date(body.scheduledAt).toISOString(),
        professional: body.professional,
        status: 'SCHEDULED',
        notes: body.notes ?? null,
      })
      .returning()
      .get();
  }

  /** Marking a visit as missed notifies the health unit right away. */
  updateStatus(id: number, body: UpdateAppointmentBody): Appointment {
    const row = this.db
      .update(appointments)
      .set({ status: body.status })
      .where(eq(appointments.id, id))
      .returning()
      .get();
    if (row === undefined) throw new NotFoundException(`Consulta ${id} não encontrada`);
    if (row.status === 'MISSED') this.alerts.alertMissedAppointment(row.id);
    return row;
  }
}
