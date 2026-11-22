import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module.js';
import { PatientsModule } from '../patients/patients.module.js';
import { SymptomsController } from './symptoms.controller.js';
import { SymptomsService } from './symptoms.service.js';

@Module({
  imports: [PatientsModule, AlertsModule],
  controllers: [SymptomsController],
  providers: [SymptomsService],
})
export class SymptomsModule {}
