import { useState } from "react";
import type { CloseReason, Position } from "../types/domain";
import { Field, Modal, inputClass } from "./Modal";
import { todayISO } from "../lib/format";

const REASONS: { id: CloseReason; label: string }[] = [
  { id: "VENCIMENTO_OTM", label: "Venceu fora do dinheiro (virou pó)" },
  { id: "EXERCICIO", label: "Foi exercida" },
  { id: "RECOMPRA_ANTECIPADA", label: "Recompra/venda antecipada" },
  { id: "VIRADA_POSICAO", label: "Virada de posição (rolagem)" },
  { id: "STOP_GESTAO", label: "Encerrada por gestão de risco" },
];

export function CloseModal({
  position,
  onClose,
  onConfirm,
}: {
  position: Position;
  onClose: () => void;
  onConfirm: (data: {
    closedDate: string;
    closeReason: CloseReason;
    legExitPremiums: Record<string, number>;
    underlyingExitPrice?: number;
  }) => void;
}) {
  const [closedDate, setClosedDate] = useState(todayISO());
  const [closeReason, setCloseReason] = useState<CloseReason>("VENCIMENTO_OTM");
  const [legExitPremiums, setLegExitPremiums] = useState<Record<string, number>>(
    Object.fromEntries(position.legs.map((l) => [l.id, closeReason === "VENCIMENTO_OTM" ? 0 : l.premium]))
  );
  const [underlyingExitPrice, setUnderlyingExitPrice] = useState(position.underlyingEntryPrice ?? 0);
  const [sellUnderlying, setSellUnderlying] = useState(false);

  function handleReasonChange(reason: CloseReason) {
    setCloseReason(reason);
    if (reason === "VENCIMENTO_OTM") {
      setLegExitPremiums(Object.fromEntries(position.legs.map((l) => [l.id, 0])));
    }
  }

  return (
    <Modal title={`Encerrar operação — ${position.ticker}`} onClose={onClose} wide>
      <Field label="Data de encerramento">
        <input
          type="date"
          className={inputClass}
          value={closedDate}
          onChange={(e) => setClosedDate(e.target.value)}
        />
      </Field>

      <Field label="Motivo do encerramento">
        <select
          className={inputClass}
          value={closeReason}
          onChange={(e) => handleReasonChange(e.target.value as CloseReason)}
        >
          {REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="text-xs font-medium text-[var(--color-muted)] mt-2 mb-1">
        Prêmio de saída por perna (0 se virou pó / foi exercida sem valor residual)
      </div>
      <div className="space-y-2 mb-3">
        {position.legs.map((leg) => (
          <div key={leg.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-md p-2">
            <span className="flex-1">
              {leg.action} {leg.type} strike {leg.strike.toFixed(2)}
            </span>
            <input
              type="number"
              step="0.01"
              className={`${inputClass} w-24`}
              value={legExitPremiums[leg.id]}
              onChange={(e) =>
                setLegExitPremiums((prev) => ({ ...prev, [leg.id]: Number(e.target.value) }))
              }
            />
          </div>
        ))}
      </div>

      {position.requiresUnderlying && (
        <>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox"
              checked={sellUnderlying}
              onChange={(e) => setSellUnderlying(e.target.checked)}
            />
            Também vendi/liquidei o ativo-objeto nesta data
          </label>
          {sellUnderlying && (
            <Field label={`Preço de saída de ${position.ticker}`}>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={underlyingExitPrice}
                onChange={(e) => setUnderlyingExitPrice(Number(e.target.value))}
              />
            </Field>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border">
          Cancelar
        </button>
        <button
          onClick={() =>
            onConfirm({
              closedDate,
              closeReason,
              legExitPremiums,
              underlyingExitPrice: sellUnderlying ? underlyingExitPrice : undefined,
            })
          }
          className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)]"
        >
          Encerrar operação
        </button>
      </div>
    </Modal>
  );
}
