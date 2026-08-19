export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "gain" | "loss";
}) {
  const valueColor =
    tone === "gain"
      ? "text-[var(--color-gain)]"
      : tone === "loss"
        ? "text-[var(--color-loss)]"
        : "text-[var(--color-ink)]";

  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted)] font-medium">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-muted)] mt-1">{sub}</div>}
    </div>
  );
}

export function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "red" | "amber" | "blue";
}) {
  const map: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-[var(--color-gain-light)] text-[var(--color-gain)]",
    red: "bg-[var(--color-loss-light)] text-[var(--color-loss)]",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}
