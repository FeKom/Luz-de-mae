import type {
  Alert,
  AlertStatus,
  Appointment,
  CareItemStatus,
  CreateAppointmentBody,
  HealthUnit,
  HealthUnitDashboard,
  Indicators,
  PatientDetail,
  PatientSummary,
  SymptomReport,
  SymptomReportBody,
  SymptomReportResult,
  UpdateAlertBody,
} from "@luz-de-mae/shared";

/** Server-side only: pages and Server Actions call the NestJS API directly. */
const API_URL = process.env.API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(" ") : body.message;
    throw new ApiError(response.status, message ?? `API respondeu ${response.status}`);
  }
  return (await response.json()) as T;
}

const send = <T>(method: string, path: string, body: unknown): Promise<T> =>
  request<T>(path, { method, body: JSON.stringify(body) });

export const getPatients = (): Promise<PatientSummary[]> => request("/patients");
export const getPatient = (id: number): Promise<PatientDetail> => request(`/patients/${id}`);
export const getAppointments = (id: number): Promise<Appointment[]> =>
  request(`/patients/${id}/appointments`);
export const getSymptomReports = (id: number): Promise<SymptomReport[]> =>
  request(`/patients/${id}/symptom-reports`);
export const getPatientAlerts = (id: number): Promise<Alert[]> => request(`/patients/${id}/alerts`);
export const getHealthUnits = (): Promise<HealthUnit[]> => request("/health-units");
export const getDashboard = (id: number): Promise<HealthUnitDashboard> =>
  request(`/health-units/${id}/dashboard`);
export const getIndicators = (): Promise<Indicators> => request("/indicators");

export const postSymptomReport = (id: number, body: SymptomReportBody): Promise<SymptomReportResult> =>
  send("POST", `/patients/${id}/symptom-reports`, body);
export const postAppointment = (id: number, body: CreateAppointmentBody): Promise<Appointment> =>
  send("POST", `/patients/${id}/appointments`, body);
export const patchAppointment = (id: number, status: Appointment["status"]): Promise<Appointment> =>
  send("PATCH", `/appointments/${id}`, { status });
export const putCareItem = (id: number, itemId: string, done: boolean): Promise<CareItemStatus[]> =>
  send("PUT", `/patients/${id}/care-items/${itemId}`, { done });
export const patchAlert = (id: number, body: UpdateAlertBody): Promise<Alert> =>
  send("PATCH", `/alerts/${id}`, body);
export const postScan = (): Promise<{ missedAppointments: number; latePrenatal: number }> =>
  send("POST", "/alerts/scan", {});

export type { AlertStatus };
