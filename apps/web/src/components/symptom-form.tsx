"use client";

import { SYMPTOM_CODES, SYMPTOMS, type SymptomReportResult } from "@luz-de-mae/shared";
import { useActionState } from "react";
import { reportSymptoms, type FormState } from "@/lib/actions";
import { RiskBadge, buttonClass, inputClass } from "./ui";

const INITIAL: FormState<SymptomReportResult> = { status: "idle" };

export function SymptomForm({ patientId }: { patientId: number }) {
  const [state, action, pending] = useActionState(reportSymptoms.bind(null, patientId), INITIAL);

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="mb-2 font-semibold">O que você está sentindo?</legend>
        <div className="grid gap-2">
          {SYMPTOM_CODES.map((code) => (
            <label
              key={code}
              className="flex cursor-pointer gap-3 rounded-xl border border-rose-baby p-3 has-[:checked]:border-rose-deep has-[:checked]:bg-rose-baby"
            >
              <input type="checkbox" name="symptoms" value={code} className="mt-1 size-5 accent-rose-deep" />
              <span>
                <span className="block font-semibold">{SYMPTOMS[code].label}</span>
                <span className="text-sm text-ink-soft">{SYMPTOMS[code].description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Mediu a pressão? (opcional)</legend>
        <div className="flex items-center gap-2">
          <input name="systolic" inputMode="numeric" placeholder="120" aria-label="Pressão máxima (mmHg)" className={inputClass} />
          <span className="text-ink-soft">por</span>
          <input name="diastolic" inputMode="numeric" placeholder="80" aria-label="Pressão mínima (mmHg)" className={inputClass} />
        </div>
        <p className="mt-1 text-xs text-ink-soft">Em mmHg, como aparece no aparelho: 120 por 80.</p>
      </fieldset>

      <label className="block">
        <span className="mb-2 block font-semibold">Temperatura (opcional)</span>
        <input name="temperatureCelsius" inputMode="decimal" placeholder="36,5" className={inputClass} />
      </label>

      <label className="block">
        <span className="mb-2 block font-semibold">Quer contar mais alguma coisa?</span>
        <textarea name="notes" rows={2} maxLength={500} className={inputClass} />
      </label>

      {state.status === "error" && (
        <ul role="alert" className="rounded-xl bg-risk-high-bg p-3 text-sm text-risk-high">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {state.status === "success" && <Result result={state.data} />}

      <button type="submit" disabled={pending} className={`${buttonClass} w-full py-3`}>
        {pending ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}

function Result({ result }: { result: SymptomReportResult }) {
  return (
    <div role="status" className="space-y-2 rounded-xl border-2 border-rose-deep bg-white p-4">
      <RiskBadge level={result.report.riskLevel} />
      <p className="text-lg font-semibold">{result.guidance}</p>
      {result.alert !== null && (
        <p className="text-sm">
          Alerta enviado para a sua UBS: <strong>{result.alert.details}</strong>
        </p>
      )}
    </div>
  );
}
