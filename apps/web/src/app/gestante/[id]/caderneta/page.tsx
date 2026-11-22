import { GLOSSARY, type CareItemStatus, type Trimester } from "@luz-de-mae/shared";
import type { Metadata } from "next";
import { Card, CardTitle, Tag } from "@/components/ui";
import { toggleCareItem } from "@/lib/actions";
import { getPatient } from "@/lib/api";
import { idFrom, orNotFound } from "@/lib/params";

export const metadata: Metadata = { title: "Caderneta" };

const TRIMESTERS: Trimester[] = [1, 2, 3];

export default async function CareBookPage({ params }: PageProps<"/gestante/[id]/caderneta">) {
  const id = await idFrom(params);
  const patient = await orNotFound(getPatient(id));

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-bold">Minha caderneta</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Exames e vacinas do pré-natal, explicados sem complicação. Marque o que você já fez.
        </p>
      </Card>

      {TRIMESTERS.map((t) => (
        <Card key={t}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t}º trimestre</h2>
            {t === patient.trimester && <Tag>Você está aqui</Tag>}
          </div>
          <ul className="space-y-2">
            {patient.careItems
              .filter((i) => i.trimester === t)
              .map((item) => (
                <CareRow key={item.id} patientId={id} item={item} />
              ))}
          </ul>
        </Card>
      ))}

      <Card>
        <CardTitle>Palavras que o médico usa</CardTitle>
        <dl className="space-y-3">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-semibold">{g.term}</dt>
              <dd className="text-sm text-ink-soft">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

function CareRow({ patientId, item }: { patientId: number; item: CareItemStatus }) {
  return (
    <li className={`rounded-xl p-3 ${item.done ? "bg-risk-low-bg" : "bg-rose-baby"}`}>
      <form action={toggleCareItem} className="flex items-start gap-3">
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="done" value={String(!item.done)} />
        <button
          type="submit"
          role="checkbox"
          aria-checked={item.done}
          aria-label={`${item.done ? "Desmarcar" : "Marcar"} ${item.title}`}
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 font-bold ${
            item.done ? "border-risk-low bg-risk-low text-white" : "border-rose-deep bg-white"
          }`}
        >
          {item.done ? "✓" : ""}
        </button>
        <span>
          <span className="block font-semibold">
            {item.title} <span className="text-xs font-normal text-ink-soft">({item.kind === "VACCINE" ? "vacina" : "exame"})</span>
          </span>
          <span className="text-sm text-ink-soft">{item.plainLanguage}</span>
        </span>
      </form>
    </li>
  );
}
