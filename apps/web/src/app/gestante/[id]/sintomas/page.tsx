import { SYMPTOMS } from "@luz-de-mae/shared";
import type { Metadata } from "next";
import { SymptomForm } from "@/components/symptom-form";
import { Card, CardTitle, RiskBadge } from "@/components/ui";
import { getSymptomReports } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { idFrom, orNotFound } from "@/lib/params";

export const metadata: Metadata = { title: "Como estou" };

export default async function SymptomsPage({ params }: PageProps<"/gestante/[id]/sintomas">) {
  const id = await idFrom(params);
  const reports = await orNotFound(getSymptomReports(id));

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-1 text-xl font-bold">Como você está hoje?</h1>
        <p className="mb-4 text-sm text-ink-soft">
          Se algo for um sinal de alerta, sua UBS recebe um aviso na hora.
        </p>
        <SymptomForm patientId={id} />
      </Card>

      <Card>
        <CardTitle>O que você já registrou</CardTitle>
        {reports.length === 0 ? (
          <p className="text-ink-soft">Nenhum registro ainda.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-rose-baby p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{formatDateTime(r.reportedAt)}</span>
                  <RiskBadge level={r.riskLevel} />
                </div>
                <p className="mt-1 text-sm">
                  {[
                    ...r.symptoms.map((s) => SYMPTOMS[s].label),
                    r.systolic !== null ? `Pressão ${r.systolic}/${r.diastolic}` : null,
                    r.temperatureCelsius !== null ? `${formatNumber(r.temperatureCelsius, 1)} °C` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
