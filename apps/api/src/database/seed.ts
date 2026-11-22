import {
  addDays,
  assessSymptomReport,
  expectedVisitsByWeek,
  toIsoDate,
  type SymptomReportInput,
} from '@luz-de-mae/shared';
import { count } from 'drizzle-orm';
import { symptomAlertDraft } from '../alerts/alert-rules.js';
import type { Database } from './database.js';
import { alerts, appointments, careChecks, healthUnits, patients, symptomReports } from './schema.js';

/**
 * Fictional demo data. Every date is relative to `today`, so the prototype
 * always shows patients at the same point of the pregnancy whenever it runs.
 */
interface DemoPatient {
  name: string;
  age: number;
  phone: string;
  weeks: number;
  attendedVisits: number;
  firstPregnancy: boolean;
  highRisk: boolean;
  communityAgent: string;
  unit: 0 | 1;
  /** Days from today of the next visit; negative means it already passed unmarked. */
  nextVisitInDays: number;
  doneCareItems: string[];
  report?: { daysAgo: number; input: Omit<SymptomReportInput, 'gestationalWeeks'>; inFollowUp?: boolean };
}

const DEMO_UNITS = [
  { name: 'UBS Jardim das Flores', neighborhood: 'Jardim das Flores', city: 'São Paulo', phone: '(11) 3333-1001' },
  { name: 'UBS Vila Esperança', neighborhood: 'Vila Esperança', city: 'São Paulo', phone: '(11) 3333-2002' },
];

const DEMO_PATIENTS: DemoPatient[] = [
  {
    name: 'Ana Paula Souza',
    age: 24,
    phone: '(11) 98888-0101',
    weeks: 30,
    attendedVisits: 6,
    firstPregnancy: true,
    highRisk: false,
    communityAgent: 'Rosa Lima',
    unit: 0,
    nextVisitInDays: 5,
    doneCareItems: ['hemograma-1t', 'tipagem', 'glicemia-1t', 'testes-rapidos-1t', 'usg-1t', 'vacina-influenza', 'totg'],
  },
  {
    name: 'Juliana Ferreira',
    age: 17,
    phone: '(11) 98888-0202',
    weeks: 22,
    attendedVisits: 2,
    firstPregnancy: true,
    highRisk: false,
    communityAgent: 'Rosa Lima',
    unit: 0,
    nextVisitInDays: -3,
    doneCareItems: ['tipagem', 'testes-rapidos-1t'],
  },
  {
    name: 'Márcia Oliveira',
    age: 38,
    phone: '(11) 98888-0303',
    weeks: 34,
    attendedVisits: 8,
    firstPregnancy: false,
    highRisk: true,
    communityAgent: 'Carlos Mendes',
    unit: 0,
    nextVisitInDays: 2,
    doneCareItems: ['hemograma-1t', 'tipagem', 'glicemia-1t', 'testes-rapidos-1t', 'urina-1t', 'usg-1t', 'totg', 'vacina-dtpa'],
    report: { daysAgo: 1, input: { symptoms: ['SEVERE_HEADACHE'], systolic: 150, diastolic: 96 } },
  },
  {
    name: 'Beatriz Santos',
    age: 29,
    phone: '(11) 98888-0404',
    weeks: 16,
    attendedVisits: 2,
    firstPregnancy: false,
    highRisk: false,
    communityAgent: 'Carlos Mendes',
    unit: 0,
    nextVisitInDays: 9,
    doneCareItems: ['hemograma-1t', 'tipagem', 'glicemia-1t', 'testes-rapidos-1t', 'urina-1t', 'usg-1t'],
  },
  {
    name: 'Camila Rocha',
    age: 31,
    phone: '(11) 98888-0505',
    weeks: 26,
    attendedVisits: 1,
    firstPregnancy: true,
    highRisk: false,
    communityAgent: 'Rosa Lima',
    unit: 0,
    nextVisitInDays: 12,
    doneCareItems: ['tipagem'],
  },
  {
    name: 'Fernanda Lima',
    age: 27,
    phone: '(11) 98888-0606',
    weeks: 9,
    attendedVisits: 0,
    firstPregnancy: true,
    highRisk: false,
    communityAgent: 'Sérgio Alves',
    unit: 1,
    nextVisitInDays: 4,
    doneCareItems: [],
  },
  {
    name: 'Patrícia Alves',
    age: 35,
    phone: '(11) 98888-0707',
    weeks: 37,
    attendedVisits: 10,
    firstPregnancy: false,
    highRisk: false,
    communityAgent: 'Sérgio Alves',
    unit: 1,
    nextVisitInDays: 3,
    doneCareItems: ['hemograma-1t', 'tipagem', 'glicemia-1t', 'testes-rapidos-1t', 'usg-1t', 'totg', 'vacina-dtpa', 'hemograma-3t'],
    report: { daysAgo: 2, input: { symptoms: ['FEVER', 'BURNING_URINATION'], temperatureCelsius: 38.2 }, inFollowUp: true },
  },
];

const PROFESSIONALS = ['Enf. Luciana Prado', 'Dra. Helena Costa', 'Enf. Marcos Vieira'];

/** Week of the k-th visit (1-based) if the patient followed the Ministry of Health schedule. */
function visitWeek(k: number): number {
  let week = 12;
  while (expectedVisitsByWeek(week) < k) week += 1;
  return week;
}

/** 09:00 in São Paulo (UTC-3). */
function morningAt(day: Date): string {
  return `${toIsoDate(day)}T12:00:00.000Z`;
}

export function seedDemoData(db: Database, today: Date): void {
  db.transaction((tx) => {
    const units = tx.insert(healthUnits).values(DEMO_UNITS).returning().all();

    for (const demo of DEMO_PATIENTS) {
      const lmp = addDays(today, -demo.weeks * 7);
      const unit = units[demo.unit];
      if (unit === undefined) throw new Error('demo unit missing');
      const [patient] = tx
        .insert(patients)
        .values({
          name: demo.name,
          birthDate: toIsoDate(addDays(today, -Math.round(demo.age * 365.25))),
          phone: demo.phone,
          lastMenstrualPeriod: toIsoDate(lmp),
          firstPregnancy: demo.firstPregnancy,
          highRisk: demo.highRisk,
          communityAgent: demo.communityAgent,
          healthUnitId: unit.id,
        })
        .returning()
        .all();
      if (patient === undefined) throw new Error('demo patient not inserted');

      const past = Array.from({ length: demo.attendedVisits }, (_, i) => ({
        patientId: patient.id,
        kind: 'PRENATAL' as const,
        scheduledAt: morningAt(addDays(lmp, Math.min(visitWeek(i + 1), demo.weeks - 1) * 7)),
        professional: PROFESSIONALS[i % PROFESSIONALS.length] ?? 'Equipe UBS',
        status: 'ATTENDED' as const,
        notes: null,
      }));
      const next = {
        patientId: patient.id,
        kind: 'PRENATAL' as const,
        scheduledAt: morningAt(addDays(today, demo.nextVisitInDays)),
        professional: PROFESSIONALS[0] ?? 'Equipe UBS',
        status: 'SCHEDULED' as const,
        notes: null,
      };
      tx.insert(appointments).values([...past, next]).run();

      const doneAt = today.toISOString();
      if (demo.doneCareItems.length > 0) {
        tx.insert(careChecks)
          .values(demo.doneCareItems.map((itemId) => ({ patientId: patient.id, itemId, doneAt })))
          .run();
      }

      if (demo.report !== undefined) {
        const input = { ...demo.report.input, gestationalWeeks: demo.weeks };
        const assessment = assessSymptomReport(input);
        const reportedAt = addDays(today, -demo.report.daysAgo);
        const [report] = tx
          .insert(symptomReports)
          .values({
            patientId: patient.id,
            reportedAt: reportedAt.toISOString(),
            symptoms: input.symptoms,
            systolic: input.systolic ?? null,
            diastolic: input.diastolic ?? null,
            temperatureCelsius: input.temperatureCelsius ?? null,
            notes: null,
            riskLevel: assessment.level,
            reasons: assessment.reasons,
          })
          .returning()
          .all();
        const alert = report && symptomAlertDraft(patient, report.id, assessment, reportedAt);
        if (alert) {
          tx.insert(alerts)
            .values(demo.report.inFollowUp ? { ...alert, status: 'IN_FOLLOW_UP' } : alert)
            .run();
        }
      }
    }
  });
}

export function isEmpty(db: Database): boolean {
  const [row] = db.select({ total: count() }).from(healthUnits).all();
  return (row?.total ?? 0) === 0;
}
