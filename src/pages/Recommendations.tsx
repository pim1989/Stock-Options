import { useState } from "react";
import { recommendations } from "../data/recommendations";
import type { Recommendation } from "../types/domain";
import { STRATEGY_LABELS } from "../types/domain";
import { Badge } from "../components/StatCard";
import { formatBRL, formatDate } from "../lib/format";
import { AcceptRecommendationModal } from "../components/AcceptRecommendationModal";
import { PayoffChart } from "../components/PayoffChart";
import type { PortfolioApi } from "../hooks/usePortfolio";
import { CARTEIRA_REVISADA_EM } from "../data/meta";
import { todayISO } from "../lib/format";

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

export function Recommendations({ portfolio }: { portfolio: PortfolioApi }) {
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const { dismissedRecs, dismissRecommendation, acceptedRecommendationIds, addPosition } = portfolio;

  const visible = recommendations.filter((r) => !dismissedRecs.has(r.id));

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
          Última revisão desta safra: <strong>{formatDate(CARTEIRA_REVISADA_EM)}</strong>. Cada
          card abaixo mostra a data de emissão e a validade daquela recomendação específica.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {visible.map((rec) => {
          const accepted = acceptedRecommendationIds.has(rec.id);
          const expired = rec.validUntil < todayISO();
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

              {expired && (
                <div className="text-xs bg-[var(--color-danger-light)] text-[var(--color-danger)] rounded-md px-2 py-1.5 mt-2">
                  A validade indicada para esta recomendação já passou ({formatDate(rec.validUntil)}).
                  O cenário pode ter mudado — não monte sem reavaliar a tese e cotar preços atuais.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 my-3 text-xs">
                <MiniStat label="Ganho máx." value={formatBRL(rec.maxGain)} tone="gain" />
                <MiniStat label="Perda máx." value={formatBRL(rec.maxLoss)} tone="loss" />
                <MiniStat label="Capital" value={formatBRL(rec.capitalAlocado)} />
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
                  height={150}
                />
              </div>

              <div className="text-sm space-y-1.5 flex-1">
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
                <p className="text-[var(--color-danger)]">
                  <strong>Riscos:</strong> {rec.thesis.riscos}
                </p>
              </div>

              <div className="text-xs text-[var(--color-muted)] mt-3 border-t pt-2">
                Emitida em {formatDate(rec.dateIssued)} · válida até {formatDate(rec.validUntil)} ·
                {" "}
                {rec.legs.length} perna(s) · ref. {rec.ticker} {formatBRL(rec.underlyingRefPrice)}
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

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  const color =
    tone === "gain" ? "text-[var(--color-gain)]" : tone === "loss" ? "text-[var(--color-loss)]" : "";
  return (
    <div className="bg-gray-50 rounded-md p-1.5 text-center">
      <div className="text-[10px] text-[var(--color-muted)]">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}
