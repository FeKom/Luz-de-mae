import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Card, CardTitle } from "@/components/ui";
import { getIndicators } from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Indicadores" };

export default async function IndicatorsPage() {
  const data = await getIndicators();
  const first = data.fetalDeathsByYear[0];
  const last = data.fetalDeathsByYear.at(-1);
  const none = data.lowApgarByVisits[0];
  const seven = data.lowApgarByVisits.at(-1);
  const apgarRatio = none && seven && seven.value > 0 ? none.value / seven.value : 0;
  const lastInsufficient = data.insufficientPrenatalByYear.at(-1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Por que o pré-natal importa</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Dados públicos do DATASUS (SIM e SINASC), de {data.period.from} a {data.period.to}, extraídos do TabNet
          pelo script <code>data/scripts/extract_tabnet.py</code>.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Highlight value={formatPercent(data.antepartumShare, 0)} text="dos óbitos fetais acontecem antes do parto, quando o pré-natal ainda pode agir." />
        <Highlight value={`${formatNumber(apgarRatio, 1)}×`} text="mais Apgar baixo entre bebês de mães sem pré-natal do que com 7 ou mais consultas." />
        <Highlight
          value={lastInsufficient ? formatPercent(lastInsufficient.value, 0) : "-"}
          text={`dos nascidos vivos em ${lastInsufficient?.label ?? ""} tiveram menos de 7 consultas de pré-natal.`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Óbitos fetais por ano no Brasil</CardTitle>
          <BarList points={data.fetalDeathsByYear} format={(v) => formatNumber(v)} />
          {first && last && (
            <p className="mt-3 text-sm text-ink-soft">
              Caiu de {formatNumber(first.value)} para {formatNumber(last.value)}, mas ainda são cerca de{" "}
              {formatNumber(last.value / 365)} por dia.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Apgar abaixo de 8 no 5º minuto, por consultas de pré-natal</CardTitle>
          <BarList points={data.lowApgarByVisits} format={(v) => formatPercent(v)} />
          <p className="mt-3 text-sm text-ink-soft">
            Quanto mais consultas, menor a parcela de bebês que nascem com sinais de sofrimento.
          </p>
        </Card>

        <Card>
          <CardTitle>Nascidos vivos com menos de 7 consultas</CardTitle>
          <BarList points={data.insufficientPrenatalByYear} format={(v) => formatPercent(v)} />
        </Card>

        <Card>
          <CardTitle>Óbitos fetais por mil nascimentos em {data.period.to}</CardTitle>
          <BarList
            points={data.fetalMortalityByState.slice(0, 10)}
            format={(v) => formatNumber(v, 1)}
            highlight={(p) => p.label === "São Paulo"}
          />
          <p className="mt-3 text-sm text-ink-soft">
            As 10 unidades da federação com a maior taxa. Nascimentos = nascidos vivos + óbitos fetais.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Highlight({ value, text }: { value: string; text: string }) {
  return (
    <div className="rounded-2xl bg-rose-pastel p-5">
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}
