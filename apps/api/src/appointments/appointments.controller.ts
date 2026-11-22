import {
  createAppointmentSchema,
  idParamSchema,
  updateAppointmentSchema,
  type Appointment,
  type CreateAppointmentBody,
  type UpdateAppointmentBody,
} from '@luz-de-mae/shared';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('patients/:id/appointments')
  list(@Param('id', { schema: idParamSchema }) patientId: number): Appointment[] {
    return this.appointments.listForPatient(patientId);
  }

  @Post('patients/:id/appointments')
  create(
    @Param('id', { schema: idParamSchema }) patientId: number,
    @Body({ schema: createAppointmentSchema }) body: CreateAppointmentBody,
  ): Appointment {
    return this.appointments.create(patientId, body);
  }

  @Patch('appointments/:id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateAppointmentSchema }) body: UpdateAppointmentBody,
  ): Appointment {
    return this.appointments.updateStatus(id, body);
  }
}
