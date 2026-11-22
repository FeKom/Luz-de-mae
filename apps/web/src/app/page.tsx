import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdherenceBadge, Card, CardTitle } from "@/components/ui";
import { getHealthUnits, getPatients } from "@/lib/api";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-28 items-center justify-center rounded-full bg-ink">
          <Image src="/logo.svg" alt="Logo do Luz de Mãe" width={64} height={80} priority />
        </span>
        <h1 className="text-3xl font-bold">Luz de Mãe</h1>
        <p className="max-w-xl text-ink-soft">
          A caderneta da gestante no celular. Quando um sinal de alerta aparece ou uma consulta é perdida, a
          UBS fica sabendo na hora e pode fazer a busca ativa.
        </p>
      </section>
      <Suspense fallback={<p className="text-center text-ink-soft">Carregando perfis…</p>}>
        <Profiles />
      </Suspense>
    </div>
  );
}

async function Profiles() {
  const [patients, units] = await Promise.all([getPatients(), getHealthUnits()]);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardTitle>Entrar como gestante</CardTitle>
        <p className="mb-3 text-sm text-ink-soft">Protótipo sem senha: escolha uma gestante fictícia.</p>
        <ul className="divide-y divide-rose-baby">
          {patients.map((p) => (
            <li key={p.id}>
              <Link
                href={`/gestante/${p.id}`}
                className="flex items-center justify-between gap-3 py-3 hover:text-rose-deep"
              >
                <span>
                  <span className="block font-semibold">{p.name}</span>
                  <span className="text-sm text-ink-soft">
                    {p.gestationalAge.weeks} semanas · {p.trimester}º trimestre
                  </span>
                </span>
                <AdherenceBadge level={p.adherence.level} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardTitle>Entrar como equipe da UBS</CardTitle>
        <p className="mb-3 text-sm text-ink-soft">Painel de alertas e busca ativa da unidade.</p>
        <ul className="divide-y divide-rose-baby">
          {units.map((u) => (
            <li key={u.id}>
              <Link href={`/ubs/${u.id}`} className="block py-3 hover:text-rose-deep">
                <span className="block font-semibold">{u.name}</span>
                <span className="text-sm text-ink-soft">
                  {u.neighborhood}, {u.city}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/indicadores" className="mt-4 inline-block text-sm font-semibold text-rose-deep hover:underline">
          Ver por que isso importa: indicadores do DATASUS →
        </Link>
      </Card>
    </div>
  );
}
