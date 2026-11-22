"use client";

import { APPOINTMENT_KIND_LABELS, APPOINTMENT_KINDS } from "@luz-de-mae/shared";
import { useActionState } from "react";
import { scheduleAppointment, type FormState } from "@/lib/actions";
import { buttonClass, inputClass } from "./ui";

const INITIAL: FormState<null> = { status: "idle" };

export function AppointmentForm({ patientId, minDate }: { patientId: number; minDate: string }) {
  const [state, action, pending] = useActionState(scheduleAppointment.bind(null, patientId), INITIAL);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Tipo</span>
        <select name="kind" className={inputClass} defaultValue="PRENATAL">
          {APPOINTMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {APPOINTMENT_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Data</span>
          <input type="date" name="date" min={minDate} required className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Horário</span>
          <input type="time" name="time" defaultValue="09:00" required className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Profissional</span>
        <input name="professional" defaultValue="Enf. Luciana Prado" required className={inputClass} />
      </label>
      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-risk-high-bg p-3 text-sm text-risk-high">
          {state.errors.join(" ")}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="rounded-xl bg-risk-low-bg p-3 text-sm text-risk-low">
          Consulta agendada.
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
        {pending ? "Agendando…" : "Agendar consulta"}
      </button>
    </form>
  );
}
