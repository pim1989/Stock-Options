import type { ReactNode } from "react";
import { formatDate, formatDateTime } from "../lib/format";
import { marketSnapshotGeneratedAt } from "../lib/marketData";

export type TabId = "dashboard" | "recomendacoes" | "operacoes" | "ir" | "educacao";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Visão Geral" },
  { id: "recomendacoes", label: "Carteira Recomendada" },
  { id: "operacoes", label: "Minhas Operações" },
  { id: "ir", label: "Imposto de Renda" },
  { id: "educacao", label: "Biblioteca" },
];

export function Layout({
  active,
  onChange,
  darfBadge,
  revisedAt,
  children,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  darfBadge?: number;
  revisedAt?: string;
  children: ReactNode;
}) {
  const badges: Partial<Record<TabId, number>> = { ir: darfBadge };
  return (
    <>
      <MarketFreshnessBar />
      <LayoutInner active={active} onChange={onChange} badges={badges} revisedAt={revisedAt}>
        {children}
      </LayoutInner>
    </>
  );
}

/**
 * Indicador visível de "os dados de mercado (cotação/fundamentos) estão em
 * dia?" — o workflow (.github/workflows/update-market-data.yml) roda 1x/dia
 * às 9h de Brasília; se o snapshot ficar mais velho que isso (falha do
 * workflow, ou ninguém rodou ainda), o aviso muda de cor pra deixar claro
 * que os números podem estar desatualizados, em vez de o usuário descobrir
 * isso só olhando data por data em cada recomendação.
 */
function MarketFreshnessBar() {
  const generatedAt = marketSnapshotGeneratedAt();
  if (!generatedAt) {
    return (
      <div className="bg-gray-700 text-white text-center text-[11px] py-1">
        Dados de mercado ainda não foram carregados nesta safra.
      </div>
    );
  }
  const hoursAgo = (Date.now() - new Date(generatedAt).getTime()) / 3600000;
  const status =
    hoursAgo < 30
      ? { color: "bg-[var(--color-gain)]", label: "em dia" }
      : hoursAgo < 72
        ? { color: "bg-amber-500", label: "desatualizando" }
        : { color: "bg-[var(--color-danger)]", label: "desatualizado" };
  return (
    <div className="bg-[var(--color-ink)] text-white text-center text-[11px] py-1 flex items-center justify-center gap-1.5">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.color}`} />
      Dados de mercado (cotação/fundamentos) {status.label} — última atualização{" "}
      {formatDateTime(generatedAt)}
    </div>
  );
}

function LayoutInner({
  active,
  onChange,
  badges,
  revisedAt,
  children,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges: Partial<Record<TabId, number>>;
  revisedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-[var(--color-brand-dark)] text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)] flex items-center justify-center font-bold text-[var(--color-brand-dark)]">
              R
            </div>
            <div>
              <div className="font-semibold leading-tight">RCO Dash</div>
              <div className="text-xs text-white/70 leading-tight">
                Gestão de Operações Estruturadas com Opções — B3
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition relative ${
                  active === t.id
                    ? "bg-white text-[var(--color-brand-dark)]"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                {t.label}
                {badges[t.id] ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-danger)] text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                    {badges[t.id]}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="bg-[var(--color-brand-light)] border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-2 text-xs text-[var(--color-brand-dark)]">
          <strong>Aviso:</strong> conteúdo educacional e de organização pessoal, não é
          recomendação formal de investimento (não substitui um analista CNPI ou seu
          contador). Estruturas sempre com risco definido — nunca venda de opção a
          descoberto. Cotações de referência, confira preços reais antes de operar.
          {revisedAt && (
            <>
              {" "}
              <strong>Carteira recomendada revisada em {formatDate(revisedAt)}.</strong> Cada
              recomendação também mostra sua própria validade — não monte uma estrutura
              expirada sem reavaliar o cenário.
            </>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>

      <footer className="border-t border-[var(--color-border)] text-center text-xs text-[var(--color-muted)] py-4">
        RCO Dash — seus dados ficam salvos localmente neste navegador. Faça backup
        regularmente pela tela de Minhas Operações.
      </footer>
    </div>
  );
}
