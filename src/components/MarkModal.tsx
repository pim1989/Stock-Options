import { useState } from "react";
import type { Position } from "../types/domain";
import { Field, Modal, inputClass } from "./Modal";
import { todayISO } from "../lib/format";
import { currentLegPremium, currentUnderlyingPrice } from "../lib/calculations";

export function MarkModal({
  position,
  onClose,
  onConfirm,
}: {
  position: Position;
  onClose: () => void;
  onConfirm: (data: { date: string; underlyingPrice?: number; legPremiums: Record<string, number>; note?: string }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [underlyingPrice, setUnderlyingPrice] = useState(
    position.requiresUnderlying ? (currentUnderlyingPrice(position) ?? 0) : undefined
  );
  const [legPremiums, setLegPremiums] = useState<Record<string, number>>(
    Object.fromEntries(position.legs.map((l) => [l.id, currentLegPremium(l, position.marks)]))
  );
  const [note, setNote] = useState("");

  return (
    <Modal title={`Atualizar marcação — ${position.ticker}`} onClose={onClose} wide>
      <Field label="Data da marcação">
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {position.requiresUnderlying && (
        <Field label={`Preço atual de ${position.ticker}`}>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={underlyingPrice}
            onChange={(e) => setUnderlyingPrice(Number(e.target.value))}
          />
        </Field>
      )}

      <div className="text-xs font-medium text-[var(--color-muted)] mt-2 mb-1">
        Prêmio atual por perna (o que custaria fechar cada opção hoje)
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
              value={legPremiums[leg.id]}
              onChange={(e) => setLegPremiums((prev) => ({ ...prev, [leg.id]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>

      <Field label="Observações (opcional)">
        <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border">
          Cancelar
        </button>
        <button
          onClick={() => onConfirm({ date, underlyingPrice, legPremiums, note: note || undefined })}
          className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)]"
        >
          Salvar marcação
        </button>
      </div>
    </Modal>
  );
}
