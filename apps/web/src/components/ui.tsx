import {
  ADHERENCE_LABELS,
  RISK_LABELS,
  type AdherenceLevel,
  type RiskLevel,
} from "@luz-de-mae/shared";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold">{children}</h2>;
}

const RISK_STYLES: Record<RiskLevel, string> = {
  HIGH: "bg-risk-high-bg text-risk-high",
  MODERATE: "bg-risk-moderate-bg text-risk-moderate",
  LOW: "bg-risk-low-bg text-risk-low",
};

const FEMININE_RISK_LABELS: Record<RiskLevel, string> = { LOW: "baixa", MODERATE: "moderada", HIGH: "alta" };

/** Text always names the level, so color is never the only signal. */
export function RiskBadge({ level, prefix = "Risco" }: { level: RiskLevel; prefix?: "Risco" | "Alerta" | "Prioridade" }) {
  const label = prefix === "Prioridade" ? FEMININE_RISK_LABELS[level] : RISK_LABELS[level].toLowerCase();
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${RISK_STYLES[level]}`}>
      {prefix} {label}
    </span>
  );
}

const ADHERENCE_RISK: Record<AdherenceLevel, RiskLevel> = {
  ADEQUATE: "LOW",
  ATTENTION: "MODERATE",
  INADEQUATE: "HIGH",
};

export function AdherenceBadge({ level }: { level: AdherenceLevel }) {
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${RISK_STYLES[ADHERENCE_RISK[level]]}`}>
      Pré-natal: {ADHERENCE_LABELS[level].toLowerCase()}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full bg-rose-baby px-3 py-0.5 text-xs font-semibold">{children}</span>;
}

export const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-rose-pastel px-5 py-2.5 font-semibold text-ink transition hover:brightness-95 disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-rose-pastel bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-rose-baby disabled:opacity-60";

export const inputClass =
  "w-full rounded-xl border border-rose-pastel bg-white px-3 py-2 text-ink placeholder:text-ink-soft/50";
