import { Controller, Get, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsModule } from './alerts/alerts.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthUnitsModule } from './health-units/health-units.module.js';
import { IndicatorsModule } from './indicators/indicators.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { SymptomsModule } from './symptoms/symptoms.module.js';

@Controller('health')
class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    PatientsModule,
    AlertsModule,
    AppointmentsModule,
    SymptomsModule,
    HealthUnitsModule,
    IndicatorsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
