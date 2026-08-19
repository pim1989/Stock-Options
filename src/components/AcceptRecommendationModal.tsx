import { useState } from "react";
import type { Recommendation } from "../types/domain";
import { Field, Modal, inputClass } from "./Modal";
import { todayISO } from "../lib/format";

export function AcceptRecommendationModal({
  recommendation,
  onClose,
  onConfirm,
}: {
  recommendation: Recommendation;
  onClose: () => void;
  onConfirm: (data: {
    acceptedDate: string;
    brokerName: string;
    legPremiums: Record<string, number>;
    underlyingEntryPrice?: number;
    underlyingQty?: number;
    dayTrade: boolean;
    notes: string;
  }) => void;
}) {
  const [acceptedDate, setAcceptedDate] = useState(todayISO());
  const [brokerName, setBrokerName] = useState("");
  const [legPremiums, setLegPremiums] = useState<Record<string, number>>(
    Object.fromEntries(recommendation.legs.map((l) => [l.id, l.premium]))
  );
  const [underlyingEntryPrice, setUnderlyingEntryPrice] = useState(recommendation.underlyingRefPrice);
  const [underlyingQty, setUnderlyingQty] = useState(recommendation.underlyingQtySuggested ?? 0);
  const [dayTrade, setDayTrade] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <Modal title={`Confirmar montagem — ${recommendation.ticker}`} onClose={onClose} wide>
      <p className="text-xs text-[var(--color-muted)] mb-4">
        Ajuste os valores abaixo para os preços reais obtidos na sua corretora. A partir da
        data de montagem, o RCO Dash passa a calcular o resultado desta operação.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data em que montou a operação">
          <input
            type="date"
            className={inputClass}
            value={acceptedDate}
            onChange={(e) => setAcceptedDate(e.target.value)}
          />
        </Field>
        <Field label="Corretora (opcional)">
          <input
            className={inputClass}
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            placeholder="Ex: XP, Rico, BTG..."
          />
        </Field>
      </div>

      {recommendation.requiresUnderlying && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Preço de compra do ativo (${recommendation.ticker})`}>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={underlyingEntryPrice}
              onChange={(e) => setUnderlyingEntryPrice(Number(e.target.value))}
            />
          </Field>
          <Field label="Quantidade de ações">
            <input
              type="number"
              className={inputClass}
              value={underlyingQty}
              onChange={(e) => setUnderlyingQty(Number(e.target.value))}
            />
          </Field>
        </div>
      )}

      <div className="text-xs font-medium text-[var(--color-muted)] mt-2 mb-1">
        Prêmios efetivamente obtidos por perna
      </div>
      <div className="space-y-2 mb-3">
        {recommendation.legs.map((leg) => (
          <div key={leg.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-md p-2">
            <span className="flex-1">
              {leg.action} {leg.type} strike {leg.strike.toFixed(2)} · qtd {leg.quantity}
            </span>
            <input
              type="number"
              step="0.01"
              className={`${inputClass} w-24`}
              value={legPremiums[leg.id]}
              onChange={(e) =>
                setLegPremiums((prev) => ({ ...prev, [leg.id]: Number(e.target.value) }))
              }
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={dayTrade} onChange={(e) => setDayTrade(e.target.checked)} />
        Operação em regime day trade (compra e venda no mesmo dia)
      </label>

      <Field label="Observações (opcional)">
        <textarea
          className={inputClass}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border">
          Cancelar
        </button>
        <button
          onClick={() =>
            onConfirm({
              acceptedDate,
              brokerName,
              legPremiums,
              underlyingEntryPrice: recommendation.requiresUnderlying ? underlyingEntryPrice : undefined,
              underlyingQty: recommendation.requiresUnderlying ? underlyingQty : undefined,
              dayTrade,
              notes,
            })
          }
          className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)]"
        >
          Confirmar montagem
        </button>
      </div>
    </Modal>
  );
}
