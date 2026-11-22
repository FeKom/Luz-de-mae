import { idParamSchema, type HealthUnit, type HealthUnitDashboard } from '@luz-de-mae/shared';
import { Controller, Get, Param } from '@nestjs/common';
import { HealthUnitsService } from './health-units.service.js';

@Controller('health-units')
export class HealthUnitsController {
  constructor(private readonly healthUnits: HealthUnitsService) {}

  @Get()
  list(): HealthUnit[] {
    return this.healthUnits.list();
  }

  @Get(':id/dashboard')
  dashboard(@Param('id', { schema: idParamSchema }) id: number): HealthUnitDashboard {
    return this.healthUnits.dashboard(id);
  }
}
