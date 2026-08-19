import { CODIGO_DARF, buildDarfAlerts, computeMonthlyTax } from "../lib/darf";
import type { AlertLevel } from "../lib/darf";
import { formatBRL, formatDate, monthLabel } from "../lib/format";
import { Badge } from "../components/StatCard";
import { taxNotes } from "../data/education";
import type { PortfolioApi } from "../hooks/usePortfolio";

const ALERT_STYLE: Record<AlertLevel, { color: "red" | "amber" | "blue" | "gray"; label: string }> = {
  ATRASADO: { color: "red", label: "Atrasado" },
  PROXIMO: { color: "amber", label: "Vence em breve" },
  FUTURO: { color: "blue", label: "A pagar" },
  DISPENSADO: { color: "gray", label: "Abaixo do mínimo" },
};

export function TaxModule({ portfolio }: { portfolio: PortfolioApi }) {
  const { positions, paidDarfKeys, toggleDarfPaid } = portfolio;
  const results = computeMonthlyTax(positions);
  const alerts = buildDarfAlerts(results, paidDarfKeys);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Imposto de Renda — Módulo DARF</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Apuração mensal do IR sobre suas operações de opções encerradas, com compensação
          de prejuízos e alertas de vencimento.
        </p>
      </div>

      {alerts.filter((a) => a.level !== "DISPENSADO").length > 0 && (
        <div className="card p-4 border-[var(--color-danger)]">
          <div className="font-semibold mb-2">Alertas de DARF</div>
          <div className="space-y-2">
            {alerts
              .filter((a) => a.level !== "DISPENSADO")
              .map((a) => {
                const style = ALERT_STYLE[a.level];
                const key = `${a.result.competencia}|${a.result.modalidade}`;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 text-sm bg-gray-50 rounded-md px-3 py-2"
                  >
                    <div>
                      <Badge color={style.color}>{style.label}</Badge>{" "}
                      <strong>{formatBRL(a.valorDevido)}</strong> — competência{" "}
                      {monthLabel(a.result.competencia)} (
                      {a.result.modalidade === "DAY_TRADE" ? "Day Trade" : "Comum"}, código{" "}
                      {CODIGO_DARF[a.result.modalidade]}) — vence {formatDate(a.result.vencimento)}
                      {a.diasParaVencimento >= 0
                        ? ` (em ${a.diasParaVencimento} dia(s))`
                        : ` (${Math.abs(a.diasParaVencimento)} dia(s) atrasado)`}
                    </div>
                    <button
                      onClick={() => toggleDarfPaid(key)}
                      className="px-3 py-1 text-xs rounded-md border shrink-0"
                    >
                      Marcar como pago
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="card p-4 overflow-x-auto">
        <div className="font-medium mb-2 text-sm">Apuração mês a mês</div>
        {results.length === 0 ? (
          <div className="text-sm text-[var(--color-muted)] py-6 text-center">
            Nenhuma operação encerrada ainda — o cálculo de IR aparece aqui conforme você
            for fechando operações em "Minhas Operações".
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-[var(--color-muted)] border-b">
                <th className="py-2 pr-2">Competência</th>
                <th className="py-2 pr-2">Modalidade</th>
                <th className="py-2 pr-2 text-right">Resultado do mês</th>
                <th className="py-2 pr-2 text-right">Prejuízo compensado</th>
                <th className="py-2 pr-2 text-right">Base de cálculo</th>
                <th className="py-2 pr-2 text-right">IR devido</th>
                <th className="py-2 pr-2">Vencimento</th>
                <th className="py-2 pr-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const key = `${r.competencia}|${r.modalidade}`;
                const paid = paidDarfKeys.has(key);
                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-2">{monthLabel(r.competencia)}</td>
                    <td className="py-2 pr-2">
                      {r.modalidade === "DAY_TRADE" ? "Day Trade (5273)" : "Comum (6015)"}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right ${
                        r.resultadoMes >= 0 ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
                      }`}
                    >
                      {formatBRL(r.resultadoMes)}
                    </td>
                    <td className="py-2 pr-2 text-right">{formatBRL(r.prejuizoCompensado)}</td>
                    <td className="py-2 pr-2 text-right">{formatBRL(r.baseCalculo)}</td>
                    <td className="py-2 pr-2 text-right font-semibold">{formatBRL(r.irDevido)}</td>
                    <td className="py-2 pr-2">{formatDate(r.vencimento)}</td>
                    <td className="py-2 pr-2">
                      {r.irDevido <= 0 ? (
                        <Badge color="gray">Sem imposto</Badge>
                      ) : r.abaixoDoMinimo ? (
                        <Badge color="gray">Abaixo do mínimo</Badge>
                      ) : paid ? (
                        <Badge color="green">Pago</Badge>
                      ) : (
                        <button
                          onClick={() => toggleDarfPaid(key)}
                          className="text-xs underline text-[var(--color-brand)]"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2 text-sm">Como funciona o cálculo</div>
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          {taxNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
