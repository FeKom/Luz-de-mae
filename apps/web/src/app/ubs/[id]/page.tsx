import { RISK_LEVELS, type AlertView } from "@luz-de-mae/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCard } from "@/components/alert-card";
import { AdherenceBadge, Card, CardTitle, RiskBadge, secondaryButtonClass } from "@/components/ui";
import { runActiveSearch } from "@/lib/actions";
import { getDashboard } from "@/lib/api";
import { ageInYears, formatDate } from "@/lib/format";
import { idFrom, orNotFound } from "@/lib/params";

export const metadata: Metadata = { title: "Painel da UBS" };

const FILTERS = [
  { key: "ativos", label: "Ativos", test: (a: AlertView) => a.status !== "RESOLVED" },
  { key: "resolvidos", label: "Resolvidos", test: (a: AlertView) => a.status === "RESOLVED" },
  { key: "todos", label: "Todos", test: () => true },
] as const;

/** Highest priority first; among equals, the newest first (API already sorts by date). */
const byPriority = (a: AlertView, b: AlertView): number =>
  RISK_LEVELS.indexOf(b.priority) - RISK_LEVELS.indexOf(a.priority);

export default async function HealthUnitPage({ params, searchParams }: PageProps<"/ubs/[id]">) {
  const id = await idFrom(params);
  const { filtro } = await searchParams;
  const filter = FILTERS.find((f) => f.key === filtro) ?? FILTERS[0];
  const { healthUnit, stats, alerts, patients } = await orNotFound(getDashboard(id));
  const visible = alerts.filter(filter.test).sort(byPriority);

  const tiles = [
    { label: "Gestantes acompanhadas", value: stats.patients },
    { label: "Alertas ativos", value: stats.openAlerts },
    { label: "Prioridade alta", value: stats.highPriorityAlerts },
    { label: "Pré-natal atrasado", value: stats.inadequatePrenatal },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-soft">Painel da equipe</p>
          <h1 className="text-2xl font-bold">{healthUnit.name}</h1>
          <p className="text-sm text-ink-soft">
            {healthUnit.neighborhood}, {healthUnit.city}
          </p>
        </div>
        <form action={runActiveSearch}>
          <button className={secondaryButtonClass}>Verificar faltas agora</button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <dt className="text-sm text-ink-soft">{t.label}</dt>
            <dd className="font-display text-3xl font-bold">{t.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Alertas para busca ativa</h2>
          <nav aria-label="Filtrar alertas" className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/ubs/${id}?filtro=${f.key}`}
                aria-current={f.key === filter.key ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${f.key === filter.key ? "bg-rose-pastel" : "hover:bg-rose-baby"}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
        {visible.length === 0 ? (
          <Card>
            <p className="text-ink-soft">Nenhum alerta neste filtro.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {visible.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardTitle>Gestantes da unidade</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th className="py-2 font-semibold">Gestante</th>
                <th className="py-2 font-semibold">Idade gestacional</th>
                <th className="py-2 font-semibold">Consultas</th>
                <th className="py-2 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-baby">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">
                    <Link href={`/gestante/${p.id}`} className="font-semibold hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-ink-soft">
                      {ageInYears(p.birthDate)} anos{p.highRisk ? " · alto risco" : ""}
                    </span>
                  </td>
                  <td className="py-2">
                    {p.gestationalAge.weeks} sem · DPP {formatDate(p.dueDate)}
                  </td>
                  <td className="py-2">
                    {p.adherence.attended} de {p.adherence.expected}
                  </td>
                  <td className="space-x-1 py-2">
                    <AdherenceBadge level={p.adherence.level} />
                    {p.highestOpenPriority && <RiskBadge level={p.highestOpenPriority} prefix="Alerta" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
