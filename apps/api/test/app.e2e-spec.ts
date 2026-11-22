import type { INestApplication } from '@nestjs/common';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AlertView, HealthUnitDashboard, SymptomReportResult } from '@luz-de-mae/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

/** Main flow: the patient reports a warning sign and the health unit follows it up. */
describe('symptom report reaches the health unit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a report with only half of the blood pressure', async () => {
    await request(app.getHttpServer())
      .post('/api/patients/1/symptom-reports')
      .send({ symptoms: [], systolic: 150 })
      .expect(400);
  });

  it('turns high blood pressure into an open alert on the unit dashboard', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/patients/1/symptom-reports')
      .send({ symptoms: [], systolic: 150, diastolic: 100 })
      .expect(201);
    const result = created.body as SymptomReportResult;
    expect(result.report.riskLevel).toBe('HIGH');
    expect(result.alert?.status).toBe('OPEN');

    const dashboard = await request(app.getHttpServer())
      .get(`/api/health-units/${result.alert?.healthUnitId}/dashboard`)
      .expect(200);
    const alerts = (dashboard.body as HealthUnitDashboard).alerts;
    expect(alerts.some((a: AlertView) => a.id === result.alert?.id)).toBe(true);

    const resolved = await request(app.getHttpServer())
      .patch(`/api/alerts/${result.alert?.id}`)
      .send({ status: 'RESOLVED', resolutionNote: 'Gestante atendida na UBS' })
      .expect(200);
    expect(resolved.body).toMatchObject({ status: 'RESOLVED', resolutionNote: 'Gestante atendida na UBS' });
  });

  it('alerts the unit when an appointment is marked as missed', async () => {
    const appointments = await request(app.getHttpServer()).get('/api/patients/4/appointments').expect(200);
    const next = (appointments.body as { id: number; status: string }[]).find((a) => a.status === 'SCHEDULED');
    await request(app.getHttpServer()).patch(`/api/appointments/${next?.id}`).send({ status: 'MISSED' }).expect(200);

    const alerts = await request(app.getHttpServer()).get('/api/patients/4/alerts').expect(200);
    expect((alerts.body as AlertView[]).map((a) => a.type)).toContain('MISSED_APPOINTMENT');
  });
});
