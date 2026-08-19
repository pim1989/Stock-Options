import { useMemo, useRef, useState } from "react";
import type { Position } from "../types/domain";
import { STRATEGY_LABELS } from "../types/domain";
import { Badge } from "../components/StatCard";
import { formatBRL, formatDate } from "../lib/format";
import { computeOpenPL, computeRealizedPL, currentLegPremium, currentUnderlyingPrice } from "../lib/calculations";
import { MarkModal } from "../components/MarkModal";
import { CloseModal } from "../components/CloseModal";
import { ManualPositionModal } from "../components/ManualPositionModal";
import type { PortfolioApi } from "../hooks/usePortfolio";
import { exportBackup, importBackup } from "../lib/storage";

export function Positions({ portfolio }: { portfolio: PortfolioApi }) {
  const { positions, addPosition, addMark, closePosition, reopenPosition, deletePosition } = portfolio;
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const open = positions.filter((p) => p.status === "ABERTA");
  const closed = positions.filter((p) => p.status === "ENCERRADA");

  function handleExport() {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rco-dash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string);
        importBackup(payload);
        window.location.reload();
      } catch {
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
  }

  const markingPos = positions.find((p) => p.id === markingId) ?? null;
  const closingPos = positions.find((p) => p.id === closingId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Minhas Operações</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Operações que você efetivamente montou na corretora, com acompanhamento de
            resultado desde a data de montagem.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-brand)] text-white font-medium">
            + Registrar operação
          </button>
          <button onClick={handleExport} className="px-3 py-1.5 text-sm rounded-md border">
            Exportar backup
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm rounded-md border">
            Importar backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
          />
        </div>
      </div>

      <section>
        <h2 className="font-medium mb-2">Abertas ({open.length})</h2>
        {open.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--color-muted)]">
            Nenhuma operação aberta. Aceite uma recomendação ou registre uma manual.
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((p) => (
              <OpenPositionRow
                key={p.id}
                position={p}
                onMark={() => setMarkingId(p.id)}
                onCloseClick={() => setClosingId(p.id)}
                onDelete={() => confirm("Excluir esta operação?") && deletePosition(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-medium mb-2">Encerradas ({closed.length})</h2>
        {closed.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--color-muted)]">
            Nenhuma operação encerrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {closed.map((p) => (
              <ClosedPositionRow
                key={p.id}
                position={p}
                onReopen={() => reopenPosition(p.id)}
                onDelete={() => confirm("Excluir esta operação?") && deletePosition(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {markingPos && (
        <MarkModal
          position={markingPos}
          onClose={() => setMarkingId(null)}
          onConfirm={(data) => {
            addMark(markingPos.id, data);
            setMarkingId(null);
          }}
        />
      )}

      {closingPos && (
        <CloseModal
          position={closingPos}
          onClose={() => setClosingId(null)}
          onConfirm={(data) => {
            closePosition(closingPos.id, data);
            setClosingId(null);
          }}
        />
      )}

      {showManual && (
        <ManualPositionModal
          onClose={() => setShowManual(false)}
          onConfirm={(pos) => {
            addPosition(pos);
            setShowManual(false);
          }}
        />
      )}
    </div>
  );
}

function OpenPositionRow({
  position,
  onMark,
  onCloseClick,
  onDelete,
}: {
  position: Position;
  onMark: () => void;
  onCloseClick: () => void;
  onDelete: () => void;
}) {
  const pl = computeOpenPL(position);
  const days = useMemo(
    () => Math.floor((Date.now() - new Date(position.acceptedDate).getTime()) / 86400000),
    [position.acceptedDate]
  );

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold">
            {position.ticker} <span className="text-[var(--color-muted)] font-normal text-sm">— {STRATEGY_LABELS[position.strategyType]}</span>
          </div>
          <div className="text-xs text-[var(--color-muted)]">
            Montada em {formatDate(position.acceptedDate)} · há {days} dia(s)
            {position.brokerName ? ` · ${position.brokerName}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold ${pl.totalOpenPL >= 0 ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"}`}>
            {formatBRL(pl.totalOpenPL)}
          </div>
          <div className="text-xs text-[var(--color-muted)]">
            {pl.returnPct >= 0 ? "+" : ""}
            {pl.returnPct.toFixed(1)}% sobre {formatBRL(pl.capital)}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs space-y-1">
        {position.legs.map((leg) => (
          <div key={leg.id} className="flex justify-between bg-gray-50 rounded px-2 py-1">
            <span>
              {leg.action} {leg.type} K={leg.strike.toFixed(2)} · qtd {leg.quantity} · venc. {formatDate(leg.expiry)}
            </span>
            <span>
              entrada {leg.premium.toFixed(2)} → atual {currentLegPremium(leg, position.marks).toFixed(2)}
            </span>
          </div>
        ))}
        {position.requiresUnderlying && (
          <div className="flex justify-between bg-gray-50 rounded px-2 py-1">
            <span>Ativo-objeto: {position.underlyingQty} ações</span>
            <span>
              entrada {position.underlyingEntryPrice?.toFixed(2)} → atual{" "}
              {(currentUnderlyingPrice(position) ?? 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={onMark} className="px-3 py-1.5 text-xs rounded-md border">
          Atualizar marcação
        </button>
        <button onClick={onCloseClick} className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-brand)] text-white">
          Encerrar operação
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 text-xs rounded-md text-[var(--color-danger)] ml-auto">
          Excluir
        </button>
      </div>
    </div>
  );
}

function ClosedPositionRow({
  position,
  onReopen,
  onDelete,
}: {
  position: Position;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const r = computeRealizedPL(position);
  return (
    <div className="card p-4 opacity-90">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold">
            {position.ticker} <span className="text-[var(--color-muted)] font-normal text-sm">— {STRATEGY_LABELS[position.strategyType]}</span>
          </div>
          <div className="text-xs text-[var(--color-muted)]">
            {formatDate(position.acceptedDate)} → {formatDate(position.closedDate ?? "")}
            {" · "}
            <Badge color="gray">{position.closeReason}</Badge>
          </div>
        </div>
        <div className={`text-lg font-semibold ${r.totalRealized >= 0 ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"}`}>
          {formatBRL(r.totalRealized)}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onReopen} className="px-3 py-1.5 text-xs rounded-md border">
          Reabrir
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 text-xs rounded-md text-[var(--color-danger)] ml-auto">
          Excluir
        </button>
      </div>
    </div>
  );
}
