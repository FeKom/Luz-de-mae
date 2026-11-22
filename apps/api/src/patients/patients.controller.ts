import {
  careItemToggleSchema,
  idParamSchema,
  type CareItemStatus,
  type CareItemToggleBody,
  type PatientDetail,
  type PatientSummary,
} from '@luz-de-mae/shared';
import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { PatientsService } from './patients.service.js';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  list(
    @Query('healthUnitId', { schema: idParamSchema.optional() }) healthUnitId?: number,
  ): PatientSummary[] {
    return this.patients.summaries(healthUnitId);
  }

  @Get(':id')
  detail(@Param('id', { schema: idParamSchema }) id: number): PatientDetail {
    return this.patients.detail(id);
  }

  @Put(':id/care-items/:itemId')
  setCareItem(
    @Param('id', { schema: idParamSchema }) id: number,
    @Param('itemId', { schema: z.string().min(1).max(60) }) itemId: string,
    @Body({ schema: careItemToggleSchema }) body: CareItemToggleBody,
  ): CareItemStatus[] {
    return this.patients.setCareItem(id, itemId, body.done);
  }
}
