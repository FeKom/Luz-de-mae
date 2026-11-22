import {
  ALERT_STATUSES,
  idParamSchema,
  updateAlertSchema,
  type Alert,
  type AlertStatus,
  type AlertView,
  type UpdateAlertBody,
} from '@luz-de-mae/shared';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { AlertsService, type ScanResult } from './alerts.service.js';

@Controller()
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('alerts')
  list(
    @Query('healthUnitId', { schema: idParamSchema.optional() }) healthUnitId?: number,
    @Query('status', { schema: z.enum(ALERT_STATUSES).optional() }) status?: AlertStatus,
  ): AlertView[] {
    return this.alerts.list({ healthUnitId, status });
  }

  @Get('patients/:id/alerts')
  forPatient(@Param('id', { schema: idParamSchema }) patientId: number): AlertView[] {
    return this.alerts.list({ patientId });
  }

  @Patch('alerts/:id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateAlertSchema }) body: UpdateAlertBody,
  ): Alert {
    return this.alerts.update(id, body);
  }

  @Post('alerts/scan')
  @HttpCode(200)
  scan(): ScanResult {
    return this.alerts.scan();
  }
}
