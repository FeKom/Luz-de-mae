"use server";

import {
  ALERT_STATUSES,
  APPOINTMENT_STATUSES,
  createAppointmentSchema,
  symptomReportSchema,
  type SymptomReportResult,
} from "@luz-de-mae/shared";
import { refresh } from "next/cache";
import { z } from "zod";
import {
  ApiError,
  patchAlert,
  patchAppointment,
  postAppointment,
  postScan,
  postSymptomReport,
  putCareItem,
} from "./api";

export type FormState<T> =
  | { status: "idle" }
  | { status: "error"; errors: string[] }
  | { status: "success"; data: T };

const optionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value.replace(",", "."));
};

const optionalText = (value: FormDataEntryValue | null): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

function failure(error: unknown): { status: "error"; errors: string[] } {
  if (error instanceof ApiError) return { status: "error", errors: [error.message] };
  return { status: "error", errors: ["Não foi possível falar com o servidor. Tente de novo."] };
}

/** Same Zod schema the API uses, so the patient sees errors before the request leaves. */
export async function reportSymptoms(
  patientId: number,
  _prev: FormState<SymptomReportResult>,
  formData: FormData,
): Promise<FormState<SymptomReportResult>> {
  const parsed = symptomReportSchema.safeParse({
    symptoms: formData.getAll("symptoms"),
    systolic: optionalNumber(formData.get("systolic")),
    diastolic: optionalNumber(formData.get("diastolic")),
    temperatureCelsius: optionalNumber(formData.get("temperatureCelsius")),
    notes: optionalText(formData.get("notes")),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.issues.map((issue) => issue.message) };
  }
  try {
    const data = await postSymptomReport(patientId, parsed.data);
    refresh();
    return { status: "success", data };
  } catch (error) {
    return failure(error);
  }
}

export async function scheduleAppointment(
  patientId: number,
  _prev: FormState<null>,
  formData: FormData,
): Promise<FormState<null>> {
  const date = formData.get("date");
  const time = formData.get("time");
  // The form collects São Paulo local time; the API stores UTC.
  const scheduledAt = typeof date === "string" && typeof time === "string" ? `${date}T${time}:00-03:00` : "";
  const parsed = createAppointmentSchema.safeParse({
    kind: formData.get("kind"),
    scheduledAt,
    professional: formData.get("professional"),
    notes: optionalText(formData.get("notes")),
  });
  if (!parsed.success) {
    return { status: "error", errors: ["Confira o tipo, a data, o horário e o nome do profissional."] };
  }
  try {
    await postAppointment(patientId, parsed.data);
    refresh();
    return { status: "success", data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function setAppointmentStatus(formData: FormData): Promise<void> {
  const id = z.coerce.number().int().parse(formData.get("appointmentId"));
  const status = z.enum(APPOINTMENT_STATUSES).parse(formData.get("status"));
  await patchAppointment(id, status);
  refresh();
}

export async function toggleCareItem(formData: FormData): Promise<void> {
  const patientId = z.coerce.number().int().parse(formData.get("patientId"));
  const itemId = z.string().min(1).parse(formData.get("itemId"));
  const done = formData.get("done") === "true";
  await putCareItem(patientId, itemId, done);
  refresh();
}

export async function updateAlertStatus(formData: FormData): Promise<void> {
  const id = z.coerce.number().int().parse(formData.get("alertId"));
  const status = z.enum(ALERT_STATUSES).parse(formData.get("status"));
  await patchAlert(id, { status, resolutionNote: optionalText(formData.get("resolutionNote")) });
  refresh();
}

export async function runActiveSearch(): Promise<void> {
  await postScan();
  refresh();
}
