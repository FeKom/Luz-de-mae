import {
  APPOINTMENT_KIND_LABELS,
  APPOINTMENT_STATUS_LABELS,
  toIsoDate,
  type Appointment,
  type AppointmentStatus,
} from "@luz-de-mae/shared";
import type { Metadata } from "next";
import { AppointmentForm } from "@/components/appointment-form";
import { Card, CardTitle, secondaryButtonClass } from "@/components/ui";
import { setAppointmentStatus } from "@/lib/actions";
import { getAppointments } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { idFrom, orNotFound } from "@/lib/params";

export const metadata: Metadata = { title: "Consultas" };

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-rose-baby",
  ATTENDED: "bg-risk-low-bg text-risk-low",
  MISSED: "bg-risk-high-bg text-risk-high",
  CANCELLED: "bg-rose-baby text-ink-soft",
};

export default async function AppointmentsPage({ params }: PageProps<"/gestante/[id]/consultas">) {
  const id = await idFrom(params);
  const appointments = await orNotFound(getAppointments(id));
  const upcoming = appointments.filter((a) => a.status === "SCHEDULED").reverse();
  const history = appointments.filter((a) => a.status !== "SCHEDULED");

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-3 text-xl font-bold">Próximas consultas</h1>
        {upcoming.length === 0 && <p className="text-ink-soft">Nenhuma consulta marcada.</p>}
        <ul className="space-y-3">
          {upcoming.map((a) => (
            <AppointmentItem key={a.id} appointment={a} canMark />
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Agendar nova consulta</CardTitle>
        <AppointmentForm patientId={id} minDate={toIsoDate(new Date())} />
      </Card>

      <Card>
        <CardTitle>Histórico</CardTitle>
        <ul className="space-y-2">
          {history.map((a) => (
            <AppointmentItem key={a.id} appointment={a} canMark={false} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function AppointmentItem({ appointment: a, canMark }: { appointment: Appointment; canMark: boolean }) {
  return (
    <li className="rounded-xl border border-rose-baby p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{APPOINTMENT_KIND_LABELS[a.kind]}</p>
          <p className="text-sm text-ink-soft">
            {formatDateTime(a.scheduledAt)} · {a.professional}
          </p>
        </div>
        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${STATUS_STYLE[a.status]}`}>
          {APPOINTMENT_STATUS_LABELS[a.status]}
        </span>
      </div>
      {canMark && (
        <form action={setAppointmentStatus} className="mt-3 flex gap-2">
          <input type="hidden" name="appointmentId" value={a.id} />
          <button name="status" value="ATTENDED" className={secondaryButtonClass}>
            Fui à consulta
          </button>
          <button name="status" value="MISSED" className={secondaryButtonClass}>
            Não consegui ir
          </button>
        </form>
      )}
    </li>
  );
}
