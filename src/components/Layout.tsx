import type { ReactNode } from "react";

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
  children,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  darfBadge?: number;
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
                {t.id === "ir" && darfBadge ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-danger)] text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                    {darfBadge}
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
