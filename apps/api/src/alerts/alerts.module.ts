import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module.js';
import { AlertsController } from './alerts.controller.js';
import { AlertsScheduler } from './alerts.scheduler.js';
import { AlertsService } from './alerts.service.js';

@Module({
  imports: [PatientsModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsScheduler],
  exports: [AlertsService],
})
export class AlertsModule {}
