export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number, digits = 1): string {
  return `${value >= 0 ? "" : ""}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("pt-BR");
}

export function formatDateLong(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthLabel(competencia: string): string {
  const [y, m] = competencia.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
