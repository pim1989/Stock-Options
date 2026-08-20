import { useState } from "react";
import type { LegAction, OptionLeg, OptionType, Position, RiskProfile, StrategyType } from "../types/domain";
import { STRATEGY_LABELS } from "../types/domain";
import { Field, Modal, inputClass } from "./Modal";
import { todayISO } from "../lib/format";

const STRATEGIES = Object.entries(STRATEGY_LABELS) as [StrategyType, string][];
const REQUIRES_UNDERLYING_DEFAULT: Record<StrategyType, boolean> = {
  COVERED_CALL: true,
  CASH_SECURED_PUT: false,
  PROTECTIVE_PUT: true,
  COLLAR: true,
  BULL_CALL_SPREAD: false,
  BEAR_PUT_SPREAD: false,
  BULL_PUT_SPREAD: false,
  BEAR_CALL_SPREAD: false,
  IRON_CONDOR: false,
  IRON_BUTTERFLY: false,
  LONG_STRADDLE: false,
  LONG_STRANGLE: false,
  JADE_LIZARD: false,
};

function emptyLeg(id: string): OptionLeg {
  return {
    id,
    type: "CALL",
    action: "VENDA",
    underlying: "",
    strike: 0,
    premium: 0,
    quantity: 100,
    expiry: todayISO(),
  };
}

export function ManualPositionModal({
  initial,
  onClose,
  onConfirm,
}: {
  initial?: Position;
  onClose: () => void;
  onConfirm: (position: Omit<Position, "id" | "marks">) => void;
}) {
  const isEditing = !!initial;
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [strategyType, setStrategyType] = useState<StrategyType>(initial?.strategyType ?? "COVERED_CALL");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initial?.riskProfile ?? "MODERADO");
  const [acceptedDate, setAcceptedDate] = useState(initial?.acceptedDate ?? todayISO());
  const [brokerName, setBrokerName] = useState(initial?.brokerName ?? "");
  const [requiresUnderlying, setRequiresUnderlying] = useState(initial?.requiresUnderlying ?? true);
  const [underlyingQty, setUnderlyingQty] = useState(initial?.underlyingQty ?? 100);
  const [underlyingEntryPrice, setUnderlyingEntryPrice] = useState(initial?.underlyingEntryPrice ?? 0);
  const [dayTrade, setDayTrade] = useState(initial?.dayTrade ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [legs, setLegs] = useState<OptionLeg[]>(initial?.legs ?? [emptyLeg("leg-1")]);

  function updateLeg(id: string, patch: Partial<OptionLeg>) {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLeg() {
    setLegs((prev) => [...prev, emptyLeg(`leg-${prev.length + 1}-${Date.now()}`)]);
  }

  function removeLeg(id: string) {
    setLegs((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  const canSubmit = ticker.trim().length > 0 && legs.every((l) => l.strike > 0 && l.quantity > 0);

  return (
    <Modal title={isEditing ? `Ajustar operação — ${initial?.ticker}` : "Registrar operação manual"} onClose={onClose} wide>
      {isEditing && (
        <p className="text-xs text-[var(--color-muted)] mb-4">
          Use isto quando o preço efetivamente obtido na corretora foi diferente do
          planejado (prêmio, strike ou quantidade). O histórico de marcações e o status
          da operação não são afetados.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker do ativo-objeto">
          <input
            className={inputClass}
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ex: PETR4"
          />
        </Field>
        <Field label="Nome da empresa (opcional)">
          <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Estrutura">
          <select
            className={inputClass}
            value={strategyType}
            onChange={(e) => {
              const st = e.target.value as StrategyType;
              setStrategyType(st);
              setRequiresUnderlying(REQUIRES_UNDERLYING_DEFAULT[st]);
            }}
          >
            {STRATEGIES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Perfil de risco">
          <select
            className={inputClass}
            value={riskProfile}
            onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}
          >
            <option value="CONSERVADOR">Conservador</option>
            <option value="MODERADO">Moderado</option>
            <option value="AGRESSIVO">Agressivo</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data de montagem">
          <input
            type="date"
            className={inputClass}
            value={acceptedDate}
            onChange={(e) => setAcceptedDate(e.target.value)}
          />
        </Field>
        <Field label="Corretora (opcional)">
          <input className={inputClass} value={brokerName} onChange={(e) => setBrokerName(e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm mb-3">
        <input
          type="checkbox"
          checked={requiresUnderlying}
          onChange={(e) => setRequiresUnderlying(e.target.checked)}
        />
        Estrutura envolve possuir o ativo-objeto (ex: covered call, collar)
      </label>

      {requiresUnderlying && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade de ações">
            <input
              type="number"
              className={inputClass}
              value={underlyingQty}
              onChange={(e) => setUnderlyingQty(Number(e.target.value))}
            />
          </Field>
          <Field label="Preço de compra da ação">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={underlyingEntryPrice}
              onChange={(e) => setUnderlyingEntryPrice(Number(e.target.value))}
            />
          </Field>
        </div>
      )}

      <div className="text-xs font-medium text-[var(--color-muted)] mt-2 mb-1">
        Pernas de opções — nunca lance a descoberto
      </div>
      <div className="space-y-2 mb-2">
        {legs.map((leg) => (
          <div key={leg.id} className="grid grid-cols-6 gap-1.5 items-center bg-gray-50 rounded-md p-2 text-xs">
            <select
              className={inputClass}
              value={leg.action}
              onChange={(e) => updateLeg(leg.id, { action: e.target.value as LegAction })}
            >
              <option value="COMPRA">Compra</option>
              <option value="VENDA">Venda</option>
            </select>
            <select
              className={inputClass}
              value={leg.type}
              onChange={(e) => updateLeg(leg.id, { type: e.target.value as OptionType })}
            >
              <option value="CALL">Call</option>
              <option value="PUT">Put</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Strike"
              className={inputClass}
              value={leg.strike || ""}
              onChange={(e) => updateLeg(leg.id, { strike: Number(e.target.value) })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Prêmio"
              className={inputClass}
              value={leg.premium || ""}
              onChange={(e) => updateLeg(leg.id, { premium: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Qtd"
              className={inputClass}
              value={leg.quantity || ""}
              onChange={(e) => updateLeg(leg.id, { quantity: Number(e.target.value) })}
            />
            <div className="flex gap-1 items-center">
              <input
                type="date"
                className={inputClass}
                value={leg.expiry}
                onChange={(e) => updateLeg(leg.id, { expiry: e.target.value })}
              />
              <button
                onClick={() => removeLeg(leg.id)}
                className="text-[var(--color-danger)] px-1"
                title="Remover perna"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addLeg} className="text-xs text-[var(--color-brand)] font-medium mb-3">
        + adicionar perna
      </button>

      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={dayTrade} onChange={(e) => setDayTrade(e.target.checked)} />
        Operação em regime day trade
      </label>

      <Field label="Observações (opcional)">
        <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border">
          Cancelar
        </button>
        <button
          disabled={!canSubmit}
          onClick={() =>
            onConfirm({
              recommendationId: initial?.recommendationId,
              ticker,
              companyName: companyName || ticker,
              strategyType,
              riskProfile,
              acceptedDate,
              brokerName: brokerName || undefined,
              legs,
              requiresUnderlying,
              underlyingQty: requiresUnderlying ? underlyingQty : undefined,
              underlyingEntryPrice: requiresUnderlying ? underlyingEntryPrice : undefined,
              status: initial?.status ?? "ABERTA",
              dayTrade,
              notes: notes || undefined,
              closedDate: initial?.closedDate,
              closeReason: initial?.closeReason,
              underlyingExitPrice: initial?.underlyingExitPrice,
              legExitPremiums: initial?.legExitPremiums,
              realizedResult: initial?.realizedResult,
            })
          }
          className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
        >
          {isEditing ? "Salvar alterações" : "Registrar operação"}
        </button>
      </div>
    </Modal>
  );
}
