const TIME_ZONE = "America/Sao_Paulo";

export function formatDate(iso: string): string {
  const date = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return date.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWeekday(iso: string): string {
  const text = new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function firstName(fullName: string): string {
  return fullName.split(" ").slice(0, 2).join(" ");
}

export function ageInYears(birthDate: string, today: Date = new Date()): number {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  const years = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  return beforeBirthday ? years - 1 : years;
}
