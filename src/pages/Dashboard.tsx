import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Position } from "../types/domain";
import { computePortfolioSummary } from "../lib/calculations";
import { buildAllocationByTicker, buildOpenPLBars, buildRealizedTimeline } from "../lib/chartData";
import { formatBRL, formatDate } from "../lib/format";
import { StatCard } from "../components/StatCard";
import type { DarfAlert } from "../lib/darf";

const GAIN = "#0f7a4a";
const LOSS = "#b3261e";
const BRAND = "#0f5f4c";

export function Dashboard({ positions, darfAlerts }: { positions: Position[]; darfAlerts: DarfAlert[] }) {
  const summary = computePortfolioSummary(positions);
  const timeline = buildRealizedTimeline(positions);
  const allocation = buildAllocationByTicker(positions);
  const openBars = buildOpenPLBars(positions);

  const pendentes = darfAlerts.filter((a) => a.level === "ATRASADO" || a.level === "PROXIMO");

  return (
    <div className="space-y-6">
      {pendentes.length > 0 && (
        <div className="card border-[var(--color-danger)] bg-[var(--color-danger-light)] p-4">
          <div className="font-semibold text-[var(--color-danger)]">⚠ DARF pendente</div>
          <ul className="text-sm mt-1 space-y-0.5">
            {pendentes.map((a) => (
              <li key={`${a.result.competencia}-${a.result.modalidade}`}>
                Competência {a.result.competencia} ({a.result.modalidade === "DAY_TRADE" ? "Day Trade" : "Comum"}
                ): {formatBRL(a.valorDevido)} — vencimento {formatDate(a.result.vencimento)}{" "}
                {a.level === "ATRASADO" ? "(ATRASADO)" : `(em ${a.diasParaVencimento} dia(s))`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold">Visão Geral da Carteira</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Consolidado de todas as operações com opções que você registrou como montadas.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Capital alocado (aberto)"
          value={formatBRL(summary.capitalAlocadoAberto)}
          sub={`${summary.numOperacoesAbertas} operação(ões) aberta(s)`}
        />
        <StatCard
          label="P&L aberto (a mercado)"
          value={formatBRL(summary.plAbertoTotal)}
          tone={summary.plAbertoTotal >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label="P&L realizado acumulado"
          value={formatBRL(summary.plRealizadoTotal)}
          tone={summary.plRealizadoTotal >= 0 ? "gain" : "loss"}
          sub={`${summary.numOperacoesEncerradas} operação(ões) encerrada(s)`}
        />
        <StatCard
          label="Total já alocado (histórico)"
          value={formatBRL(summary.totalInvestidoHistorico)}
          sub="Soma do capital de todas as operações já montadas"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="font-medium mb-2 text-sm">Resultado realizado acumulado</div>
          {timeline.length === 0 ? (
            <EmptyChart text="Nenhuma operação encerrada ainda." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GAIN} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GAIN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatDate(d)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                  tick={{ fontSize: 11 }}
                  width={45}
                />
                <Tooltip
                  formatter={(v) => formatBRL(Number(v))}
                  labelFormatter={(d) => formatDate(String(d))}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={GAIN}
                  strokeWidth={2}
                  fill="url(#gainGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <div className="font-medium mb-2 text-sm">P&L aberto por operação (a mercado)</div>
          {openBars.length === 0 ? (
            <EmptyChart text="Nenhuma operação aberta ainda." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={openBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                  tick={{ fontSize: 11 }}
                  width={45}
                />
                <Tooltip formatter={(v) => formatBRL(Number(v))} />
                <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                  {openBars.map((b, i) => (
                    <Cell key={i} fill={b.pl >= 0 ? GAIN : LOSS} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2 text-sm">Capital alocado por ativo (operações abertas)</div>
        {allocation.length === 0 ? (
          <EmptyChart text="Nenhuma operação aberta ainda." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={allocation} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5eb" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                tick={{ fontSize: 11 }}
              />
              <YAxis type="category" dataKey="ticker" tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Bar dataKey="capital" radius={[0, 4, 4, 0]} fill={BRAND} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-[var(--color-muted)]">
      {text}
    </div>
  );
}
