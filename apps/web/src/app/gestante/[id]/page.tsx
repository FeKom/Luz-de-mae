import { APPOINTMENT_KIND_LABELS, type PatientDetail } from "@luz-de-mae/shared";
import Link from "next/link";
import { AdherenceBadge, Card, CardTitle, RiskBadge, Tag, buttonClass } from "@/components/ui";
import { getPatient, getPatientAlerts } from "@/lib/api";
import { firstName, formatDate, formatWeekday } from "@/lib/format";
import { idFrom, orNotFound } from "@/lib/params";

export default async function PatientHome({ params }: PageProps<"/gestante/[id]">) {
  const id = await idFrom(params);
  const [patient, alerts] = await Promise.all([orNotFound(getPatient(id)), getPatientAlerts(id)]);
  const openAlerts = alerts.filter((a) => a.status !== "RESOLVED");
  const nextCare = patient.careItems.filter((i) => !i.done && i.trimester <= patient.trimester).slice(0, 3);

  return (
    <div className="space-y-4">
      <Card className="bg-rose-pastel/60">
        <p className="text-sm font-semibold">Olá, {firstName(patient.name)}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {patient.gestationalAge.weeks} semanas e {patient.gestationalAge.days} dia
          {patient.gestationalAge.days === 1 ? "" : "s"}
        </h1>
        <p className="mt-1">
          {patient.trimester}º trimestre · bebê previsto para {formatDate(patient.dueDate)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdherenceBadge level={patient.adherence.level} />
          {patient.firstPregnancy && <Tag>Primeira gestação</Tag>}
          {patient.highRisk && <Tag>Pré-natal de alto risco</Tag>}
        </div>
      </Card>

      <Link href={`/gestante/${id}/sintomas`} className={`${buttonClass} w-full py-4 text-lg`}>
        Estou sentindo algo diferente
      </Link>

      {openAlerts.length > 0 && (
        <Card>
          <CardTitle>Sua UBS está acompanhando</CardTitle>
          <ul className="space-y-3">
            {openAlerts.map((a) => (
              <li key={a.id} className="rounded-xl bg-rose-baby p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{a.title}</span>
                  <RiskBadge level={a.priority} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">{a.details}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            A equipe pode ligar para você. Se piorar, procure a maternidade ou ligue 192 (SAMU).
          </p>
        </Card>
      )}

      <NextAppointment patient={patient} />

      <Card>
        <CardTitle>Pré-natal</CardTitle>
        <p>
          Você foi a <strong>{patient.adherence.attended}</strong> de{" "}
          <strong>{patient.adherence.expected}</strong> consultas esperadas até agora.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          O ideal são pelo menos 7 consultas na gestação. No Brasil, bebês de mães sem pré-natal nascem com
          Apgar baixo 3 vezes mais do que os de mães com 7 ou mais consultas (DATASUS).
        </p>
      </Card>

      {nextCare.length > 0 && (
        <Card>
          <CardTitle>Para fazer neste trimestre</CardTitle>
          <ul className="space-y-3">
            {nextCare.map((item) => (
              <li key={item.id}>
                <span className="font-semibold">{item.title}</span>
                <p className="text-sm text-ink-soft">{item.plainLanguage}</p>
              </li>
            ))}
          </ul>
          <Link href={`/gestante/${id}/caderneta`} className="mt-3 inline-block text-sm font-semibold text-rose-deep hover:underline">
            Ver caderneta completa →
          </Link>
        </Card>
      )}

      <Card>
        <CardTitle>Minha UBS</CardTitle>
        <p className="font-semibold">{patient.healthUnit.name}</p>
        <p className="text-sm text-ink-soft">
          {patient.healthUnit.neighborhood}, {patient.healthUnit.city} · {patient.healthUnit.phone}
        </p>
        <p className="mt-2 text-sm">Agente comunitário de saúde: {patient.communityAgent}</p>
      </Card>
    </div>
  );
}

function NextAppointment({ patient }: { patient: PatientDetail }) {
  const next = patient.nextAppointment;
  return (
    <Card>
      <CardTitle>Próxima consulta</CardTitle>
      {next === null ? (
        <p>
          Nenhuma consulta marcada.{" "}
          <Link href={`/gestante/${patient.id}/consultas`} className="font-semibold text-rose-deep hover:underline">
            Agendar
          </Link>
        </p>
      ) : (
        <>
          <p className="text-lg font-semibold">{formatWeekday(next.scheduledAt)}</p>
          <p className="text-sm text-ink-soft">
            {APPOINTMENT_KIND_LABELS[next.kind]} com {next.professional}
          </p>
        </>
      )}
    </Card>
  );
}
