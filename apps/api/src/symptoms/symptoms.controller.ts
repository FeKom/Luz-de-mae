import {
  idParamSchema,
  symptomReportSchema,
  type SymptomReport,
  type SymptomReportBody,
  type SymptomReportResult,
} from '@luz-de-mae/shared';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SymptomsService } from './symptoms.service.js';

@Controller('patients/:id/symptom-reports')
export class SymptomsController {
  constructor(private readonly symptoms: SymptomsService) {}

  @Get()
  list(@Param('id', { schema: idParamSchema }) patientId: number): SymptomReport[] {
    return this.symptoms.listForPatient(patientId);
  }

  @Post()
  report(
    @Param('id', { schema: idParamSchema }) patientId: number,
    @Body({ schema: symptomReportSchema }) body: SymptomReportBody,
  ): SymptomReportResult {
    return this.symptoms.report(patientId, body);
  }
}
