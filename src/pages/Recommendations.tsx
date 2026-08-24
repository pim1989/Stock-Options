import { useState } from "react";
import { recommendations } from "../data/recommendations";
import type { Recommendation } from "../types/domain";
import { STRATEGY_LABELS } from "../types/domain";
import { Badge } from "../components/StatCard";
import { formatBRL, formatDate, formatDateTime, todayISO } from "../lib/format";
import { AcceptRecommendationModal } from "../components/AcceptRecommendationModal";
import { PayoffChart } from "../components/PayoffChart";
import type { PortfolioApi } from "../hooks/usePortfolio";
import { CARTEIRA_REVISADA_EM } from "../data/meta";
import { auditPortfolio } from "../lib/audit";
import { computePayoffExtremes } from "../lib/payoff";
import { getQuote } from "../lib/marketData";

const RISK_COLOR: Record<Recommendation["riskProfile"], "green" | "amber" | "red"> = {
  CONSERVADOR: "green",
  MODERADO: "amber",
  AGRESSIVO: "red",
};

const DIRECTION_LABEL: Record<Recommendation["direction"], string> = {
  ALTA: "Viés de Alta",
  BAIXA: "Viés de Baixa",
  NEUTRO: "Neutro",
  LATERAL: "Lateral",
};

const CONVICTION_COLOR: Record<Recommendation["thesis"]["conviction"], "green" | "amber" | "gray"> = {
  ALTA: "green",
  MEDIA: "amber",
  BAIXA: "gray",
};

const CONVICTION_LABEL: Record<Recommendation["thesis"]["conviction"], string> = {
  ALTA: "Convicção alta",
  MEDIA: "Convicção média",
  BAIXA: "Convicção baixa",
};

export function Recommendations({ portfolio }: { portfolio: PortfolioApi }) {
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const { dismissedRecs, dismissRecommendation, acceptedRecommendationIds, addPosition } = portfolio;

  // Toda a safra passa por auditoria (estrutura, matemática, coerência de datas e
  // coerência entre recomendações — ex.: duas teses de direção opostas sobre o
  // mesmo ativo) antes de poder aparecer aqui — roda em background, sem UI
  // própria. Ver src/lib/audit.ts.
  const auditedById = new Map(auditPortfolio(recommendations).map((r) => [r.recommendationId, r]));
  const visible = recommendations.filter(
    (r) => !dismissedRecs.has(r.id) && (auditedById.get(r.id)?.passed ?? false)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Carteira Recomendada</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Estruturas com risco sempre definido (nunca a descoberto), fundamentadas em
          cenário macro, microeconômico e técnico. Aceite e monte na sua corretora, depois
          registre aqui para começar o acompanhamento de resultado.
        </p>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Última revisão desta safra: <strong>{formatDate(CARTEIRA_REVISADA_EM)}</strong>.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {visible.map((rec) => {
          const accepted = acceptedRecommendationIds.has(rec.id);
          const expired = rec.validUntil < todayISO();
          const underlyingForExtremes =
            rec.requiresUnderlying && rec.underlyingQtySuggested
              ? { qty: rec.underlyingQtySuggested, entryPrice: rec.underlyingRefPrice }
              : undefined;
          const extremes = computePayoffExtremes(rec.legs, underlyingForExtremes, rec.underlyingRefPrice);
          const maxLossSub =
            extremes.maxLossAtPrice <= 0
              ? "só se a ação for a zero (evento extremo)"
              : `se ${rec.ticker} ${extremes.maxLossAtPrice > rec.underlyingRefPrice ? "passar de" : "cair a"} ${formatBRL(
                  extremes.maxLossAtPrice
                )} (${(((extremes.maxLossAtPrice - rec.underlyingRefPrice) / rec.underlyingRefPrice) * 100).toFixed(1)}%)`;
          return (
            <div key={rec.id} className={`card p-4 flex flex-col ${expired ? "opacity-80" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {rec.ticker} <span className="text-[var(--color-muted)] font-normal">— {rec.companyName}</span>
                  </div>
                  <div className="text-sm text-[var(--color-brand-dark)] font-medium">
                    {STRATEGY_LABELS[rec.strategyType]}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {expired && <Badge color="red">Expirada</Badge>}
                  <Badge color={RISK_COLOR[rec.riskProfile]}>{rec.riskProfile}</Badge>
                  <Badge color="blue">{DIRECTION_LABEL[rec.direction]}</Badge>
                </div>
              </div>

              <div className="mt-2 border-l-4 border-[var(--color-brand)] bg-[var(--color-brand-light)]/40 rounded-r-md pl-2.5 pr-2 py-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">A tese</span>
                  <Badge color={CONVICTION_COLOR[rec.thesis.conviction]}>{CONVICTION_LABEL[rec.thesis.conviction]}</Badge>
                </div>
                <p className="text-sm font-medium leading-snug">{rec.thesis.headline}</p>
                <p className="text-xs text-[var(--color-muted)] mt-1.5">
                  <strong className="text-[var(--color-ink)]">Visão de preço: </strong>
                  {rec.thesis.expectedMove}
                </p>
              </div>

              {expired && (
                <div className="text-xs bg-[var(--color-danger-light)] text-[var(--color-danger)] rounded-md px-2 py-1.5 mt-2">
                  A validade indicada para esta recomendação já passou ({formatDate(rec.validUntil)}).
                  O cenário pode ter mudado — não monte sem reavaliar a tese e cotar preços atuais.
                </div>
              )}

              <div className="text-xs bg-[var(--color-brand-light)] text-[var(--color-brand-dark)] rounded-md px-2 py-1.5 mt-2 font-medium">
                {rec.ticker} agora: {formatBRL(rec.underlyingRefPrice)} (preço de referência desta safra)
              </div>

              <LiveQuoteLine ticker={rec.ticker} refPrice={rec.underlyingRefPrice} />

              <div className="grid grid-cols-3 gap-2 my-3 text-xs">
                <MiniStat
                  label="Ganho máx."
                  value={rec.maxGainUnlimited ? "Sem teto" : formatBRL(rec.maxGain)}
                  tone="gain"
                />
                <MiniStat label="Perda máx." value={formatBRL(rec.maxLoss)} tone="loss" sub={maxLossSub} />
                <MiniStat label="Capital" value={formatBRL(rec.capitalAlocado)} />
              </div>

              <div className="mb-3 text-xs">
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">
                  Estrutura sugerida (strike, prêmio estimado, quantidade)
                </div>
                <div className="space-y-1">
                  {rec.requiresUnderlying && rec.underlyingQtySuggested && (
                    <div className="flex justify-between bg-gray-50 rounded px-2 py-1">
                      <span>
                        COMPRA {rec.ticker} · {rec.underlyingQtySuggested.toLocaleString("pt-BR")} ações
                      </span>
                      <span>
                        a {formatBRL(rec.underlyingRefPrice)} ≈{" "}
                        {formatBRL(rec.underlyingRefPrice * rec.underlyingQtySuggested)}
                      </span>
                    </div>
                  )}
                  {rec.legs.map((leg) => (
                    <div key={leg.id} className="flex justify-between bg-gray-50 rounded px-2 py-1">
                      <span>
                        {leg.action} {leg.type} · strike {formatBRL(leg.strike)} ·{" "}
                        {leg.quantity.toLocaleString("pt-BR")} opções
                      </span>
                      <span>
                        prêmio ≈ {formatBRL(leg.premium)} · venc. {formatDate(leg.expiry)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3 border border-[var(--color-border)] rounded-md p-2">
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">
                  Resultado no vencimento x preço de {rec.ticker}
                </div>
                <PayoffChart
                  legs={rec.legs}
                  refPrice={rec.underlyingRefPrice}
                  requiresUnderlying={rec.requiresUnderlying}
                  underlyingQty={rec.underlyingQtySuggested}
                  underlyingEntryPrice={rec.underlyingRefPrice}
                  maxGainUnlimited={rec.maxGainUnlimited}
                  height={150}
                />
              </div>

              <div className="text-sm space-y-3 flex-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">
                    Catalisadores
                  </div>
                  <ul className="space-y-1 list-disc list-inside marker:text-[var(--color-brand)]">
                    {rec.thesis.catalysts.map((c, i) => (
                      <li key={i} className="text-xs leading-snug">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                    Fundamentação
                  </div>
                  <p>
                    <strong>Macro:</strong> {rec.thesis.macro}
                  </p>
                  <p>
                    <strong>Ativo:</strong> {rec.thesis.micro}
                  </p>
                  {rec.thesis.tecnico && (
                    <p>
                      <strong>Técnico:</strong> {rec.thesis.tecnico}
                    </p>
                  )}
                </div>

                <p className="text-[var(--color-danger)]">
                  <strong>Riscos a monitorar:</strong> {rec.thesis.riscos}
                </p>

                <div className="text-xs bg-amber-50 text-amber-900 rounded-md px-2 py-1.5">
                  <strong>O que invalidaria esta tese: </strong>
                  {rec.thesis.invalidacao}
                </div>
              </div>

              <div className="text-xs text-[var(--color-muted)] mt-3 border-t pt-2">
                Emitida em {formatDate(rec.dateIssued)} · válida até {formatDate(rec.validUntil)} ·
                {" "}
                {rec.legs.length} perna(s)
              </div>

              <div className="flex gap-2 mt-3">
                {accepted ? (
                  <Badge color="green">✓ Já montada — veja em Minhas Operações</Badge>
                ) : (
                  <>
                    <button
                      onClick={() => setSelected(rec)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-md bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)]"
                    >
                      Aceitei e montei
                    </button>
                    <button
                      onClick={() => dismissRecommendation(rec.id)}
                      className="px-3 py-1.5 text-sm rounded-md border"
                    >
                      Dispensar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="card p-6 text-center text-sm text-[var(--color-muted)] md:col-span-2">
            Nenhuma recomendação ativa no momento (todas dispensadas ou já montadas).
          </div>
        )}
      </div>

      {selected && (
        <AcceptRecommendationModal
          recommendation={selected}
          onClose={() => setSelected(null)}
          onConfirm={(data) => {
            addPosition({
              recommendationId: selected.id,
              ticker: selected.ticker,
              companyName: selected.companyName,
              strategyType: selected.strategyType,
              riskProfile: selected.riskProfile,
              brokerName: data.brokerName || undefined,
              acceptedDate: data.acceptedDate,
              legs: selected.legs.map((l) => ({ ...l, premium: data.legPremiums[l.id] ?? l.premium })),
              requiresUnderlying: selected.requiresUnderlying,
              underlyingQty: data.underlyingQty,
              underlyingEntryPrice: data.underlyingEntryPrice,
              status: "ABERTA",
              dayTrade: data.dayTrade,
              notes: data.notes || undefined,
            });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Cotação e indicadores fundamentalistas atualizados automaticamente
 * (ver src/lib/marketData.ts) — contexto de mercado ao vivo, separado do
 * preço de referência auditado acima. Some silenciosamente se ainda não
 * há snapshot pra este ticker (ex.: antes da primeira rodada do workflow).
 */
function LiveQuoteLine({ ticker, refPrice }: { ticker: string; refPrice: number }) {
  const quote = getQuote(ticker);
  if (!quote || typeof quote.price !== "number") return null;

  const deltaPct = refPrice > 0 ? ((quote.price - refPrice) / refPrice) * 100 : 0;
  const fundParts: string[] = [];
  if (typeof quote.pl === "number") fundParts.push(`P/L ${quote.pl.toFixed(1)}`);
  if (typeof quote.pvp === "number") fundParts.push(`P/VP ${quote.pvp.toFixed(2)}`);
  if (typeof quote.dy === "number") fundParts.push(`DY ${quote.dy.toFixed(1)}%`);

  return (
    <div className="text-[10px] text-[var(--color-muted)] mt-1 flex flex-wrap gap-x-2 items-center">
      <span>
        Cotação ao vivo: <strong>{formatBRL(quote.price)}</strong>{" "}
        <span className={deltaPct >= 0 ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"}>
          ({deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(1)}% vs. referência)
        </span>
      </span>
      {fundParts.length > 0 && <span>· {fundParts.join(" · ")}</span>}
      {quote.priceAsOf && <span>· atualizado {formatDateTime(quote.priceAsOf)}</span>}
      {quote.stale && <span className="text-[var(--color-danger)]">· última busca falhou, dado pode estar desatualizado</span>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss";
  sub?: string;
}) {
  const color =
    tone === "gain" ? "text-[var(--color-gain)]" : tone === "loss" ? "text-[var(--color-loss)]" : "";
  return (
    <div className="bg-gray-50 rounded-md p-1.5 text-center">
      <div className="text-[10px] text-[var(--color-muted)]">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[9px] text-[var(--color-muted)] leading-tight mt-0.5">{sub}</div>}
    </div>
  );
}
