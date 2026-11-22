import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module.js';
import { PatientsModule } from '../patients/patients.module.js';
import { HealthUnitsController } from './health-units.controller.js';
import { HealthUnitsService } from './health-units.service.js';

@Module({
  imports: [PatientsModule, AlertsModule],
  controllers: [HealthUnitsController],
  providers: [HealthUnitsService],
})
export class HealthUnitsModule {}
