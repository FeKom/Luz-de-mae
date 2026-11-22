import { ALERT_STATUS_LABELS, ALERT_TYPE_LABELS, type AlertView } from "@luz-de-mae/shared";
import Link from "next/link";
import { updateAlertStatus } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { RiskBadge, Tag, inputClass, secondaryButtonClass } from "./ui";

const BORDER: Record<AlertView["priority"], string> = {
  HIGH: "border-l-risk-high",
  MODERATE: "border-l-risk-moderate",
  LOW: "border-l-risk-low",
};

export function AlertCard({ alert }: { alert: AlertView }) {
  const active = alert.status !== "RESOLVED";
  return (
    <li className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${BORDER[alert.priority]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={alert.priority} prefix="Prioridade" />
        <Tag>{ALERT_TYPE_LABELS[alert.type]}</Tag>
        <Tag>{ALERT_STATUS_LABELS[alert.status]}</Tag>
        <span className="ml-auto text-xs text-ink-soft">{formatDateTime(alert.createdAt)}</span>
      </div>
      <p className="mt-2 font-semibold">
        <Link href={`/gestante/${alert.patientId}`} className="hover:underline">
          {alert.patientName}
        </Link>{" "}
        · {alert.title}
      </p>
      <p className="text-sm">{alert.details}</p>
      <p className="mt-1 text-xs text-ink-soft">
        Telefone {alert.patientPhone} · ACS {alert.communityAgent}
      </p>
      {alert.resolutionNote && <p className="mt-2 text-sm italic">Registro: {alert.resolutionNote}</p>}

      {active && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {alert.status === "OPEN" && (
            <form action={updateAlertStatus}>
              <input type="hidden" name="alertId" value={alert.id} />
              <button name="status" value="IN_FOLLOW_UP" className={secondaryButtonClass}>
                Iniciar busca ativa
              </button>
            </form>
          )}
          <form action={updateAlertStatus} className="flex min-w-64 flex-1 gap-2">
            <input type="hidden" name="alertId" value={alert.id} />
            <input
              name="resolutionNote"
              placeholder="O que foi feito? (ex.: consulta remarcada)"
              aria-label={`Registro da resolução do alerta de ${alert.patientName}`}
              className={`${inputClass} text-sm`}
            />
            <button name="status" value="RESOLVED" className={secondaryButtonClass}>
              Resolver
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
