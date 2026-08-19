import { recommendations } from "../data/recommendations";
import { STRATEGY_LABELS } from "../types/domain";
import { auditPortfolio } from "../lib/audit";
import type { AuditSeverity } from "../types/audit";
import { AUDIT_BENCHMARK_REVIEWED_AT, generalCrossCheck } from "../data/auditBenchmark";
import { Badge } from "../components/StatCard";
import { formatDate } from "../lib/format";

const SEVERITY_STYLE: Record<AuditSeverity, { color: "green" | "amber" | "red"; label: string }> = {
  OK: { color: "green", label: "OK" },
  ALERTA: { color: "amber", label: "Alerta" },
  FALHA: { color: "red", label: "Reprovada" },
};

export function Audit() {
  const reports = auditPortfolio(recommendations);
  const byId = new Map(recommendations.map((r) => [r.id, r]));

  const aprovadasSemRessalva = reports.filter((r) => r.severity === "OK").length;
  const aprovadasComAlerta = reports.filter((r) => r.severity === "ALERTA").length;
  const reprovadas = reports.filter((r) => !r.passed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auditoria da Carteira Recomendada</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Toda recomendação passa por esta auditoria antes de ficar disponível para aceite.
          Ela roda em duas camadas — veja como funciona cada uma abaixo.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="font-medium text-sm mb-1">1. Verificação automática (roda no seu navegador)</div>
          <p className="text-sm text-[var(--color-muted)]">
            A cada carregamento da página, cada recomendação é recalculada do zero a partir das
            próprias pernas: a estrutura é validada contra o princípio de risco definido (nunca
            venda descoberta), e ganho máximo, perda máxima, breakeven e capital alocado
            divulgados são comparados com o que a matemática das opções realmente dá. Qualquer
            divergência vira uma <strong>reprovação</strong> e a recomendação não fica disponível
            para aceite.
          </p>
        </div>
        <div className="card p-4">
          <div className="font-medium text-sm mb-1">2. Checagem cruzada com fontes públicas</div>
          <p className="text-sm text-[var(--color-muted)]">
            O RCO Dash roda 100% no seu navegador, sem servidor por trás — ele não varre a
            internet sozinho em tempo real. Essa checagem é feita manualmente (com apoio de
            busca) a cada revisão da safra, comparando teses e preços com carteiras públicas de
            corretoras e cotações recentes. O resultado — com fonte e data — fica registrado e
            reaparece aqui até a próxima revisão.{" "}
            <strong>Última checagem: {formatDate(AUDIT_BENCHMARK_REVIEWED_AT)}.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-[var(--color-gain)]">{aprovadasSemRessalva}</div>
          <div className="text-xs text-[var(--color-muted)]">aprovadas sem ressalva</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-amber-600">{aprovadasComAlerta}</div>
          <div className="text-xs text-[var(--color-muted)]">aprovadas com alerta</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold text-[var(--color-loss)]">{reprovadas}</div>
          <div className="text-xs text-[var(--color-muted)]">reprovadas (bloqueadas)</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2 text-sm">Achados gerais da checagem cruzada</div>
        <div className="space-y-3">
          {generalCrossCheck.map((item, i) => (
            <div key={i} className="text-sm border-b last:border-0 pb-3 last:pb-0">
              <p>{item.note}</p>
              {item.sources.length > 0 && (
                <div className="flex flex-wrap gap-x-3 mt-1 text-xs">
                  {item.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-brand)] underline"
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reports.map((report) => {
          const rec = byId.get(report.recommendationId);
          if (!rec) return null;
          const style = SEVERITY_STYLE[report.severity];
          return (
            <div key={report.recommendationId} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold">
                    {rec.ticker} <span className="text-[var(--color-muted)] font-normal text-sm">— {STRATEGY_LABELS[rec.strategyType]}</span>
                  </div>
                </div>
                <Badge color={style.color}>{style.label}</Badge>
              </div>
              {report.findings.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">
                  Nenhum achado — estrutura, matemática e datas conferem, sem ressalvas externas.
                </p>
              ) : (
                <ul className="text-sm space-y-1.5">
                  {report.findings.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0">
                        <Badge color={SEVERITY_STYLE[f.severity].color}>{SEVERITY_STYLE[f.severity].label}</Badge>
                      </span>
                      <span>{f.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
