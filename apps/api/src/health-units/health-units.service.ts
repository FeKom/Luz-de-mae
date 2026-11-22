import type { HealthUnit, HealthUnitDashboard } from '@luz-de-mae/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { asc, eq } from 'drizzle-orm';
import { AlertsService } from '../alerts/alerts.service.js';
import type { Database } from '../database/database.js';
import { healthUnits } from '../database/schema.js';
import { PatientsService } from '../patients/patients.service.js';

@Injectable()
export class HealthUnitsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly patients: PatientsService,
    private readonly alerts: AlertsService,
  ) {}

  list(): HealthUnit[] {
    return this.db.select().from(healthUnits).orderBy(asc(healthUnits.name)).all();
  }

  dashboard(id: number): HealthUnitDashboard {
    const healthUnit = this.db.select().from(healthUnits).where(eq(healthUnits.id, id)).get();
    if (healthUnit === undefined) throw new NotFoundException(`UBS ${id} não encontrada`);
    const alerts = this.alerts.list({ healthUnitId: id });
    const patients = this.patients.summaries(id);
    const open = alerts.filter((a) => a.status !== 'RESOLVED');
    return {
      healthUnit,
      stats: {
        patients: patients.length,
        openAlerts: open.length,
        highPriorityAlerts: open.filter((a) => a.priority === 'HIGH').length,
        inadequatePrenatal: patients.filter((p) => p.adherence.level === 'INADEQUATE').length,
      },
      alerts,
      patients,
    };
  }
}
