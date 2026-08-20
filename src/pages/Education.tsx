import { excludedStrategies, glossary, references, riskRules, strategyGuides } from "../data/education";

export function Education() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Biblioteca de Opções</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Conceitos, estruturas e boas práticas de gestão de risco usadas como base para as
          recomendações do RCO Dash.
        </p>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-3">Estratégias cobertas</div>
        <div className="space-y-4">
          {strategyGuides.map((s) => (
            <div key={s.id}>
              <div className="font-semibold text-sm text-[var(--color-brand-dark)]">{s.title}</div>
              <div className="text-sm space-y-1.5 mt-1">
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-3">Estruturas que o RCO Dash conhece, mas não recomenda</div>
        <p className="text-xs text-[var(--color-muted)] mb-3">
          Aparecem na literatura de opções e podem fazer sentido para operadores experientes,
          mas o app não as oferece como recomendação — cada uma tem um motivo específico,
          quase sempre ligado a alguma perna sem cobertura.
        </p>
        <div className="space-y-2.5">
          {excludedStrategies.map((s) => (
            <div key={s.title} className="text-sm">
              <span className="font-semibold">{s.title}:</span> <span className="text-[var(--color-muted)]">{s.reason}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-3">Regras de gestão de risco</div>
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          {riskRules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-3">Glossário</div>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {glossary.map((g) => (
            <div key={g.term}>
              <strong>{g.term}:</strong> {g.def}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-3">Leituras recomendadas</div>
        <div className="space-y-3">
          {references.map((r) => (
            <div key={r.title} className="text-sm">
              <div className="font-semibold">
                {r.title} <span className="font-normal text-[var(--color-muted)]">— {r.author}</span>
              </div>
              <div className="text-[var(--color-muted)]">{r.note}</div>
              {r.url && (
                <a href={r.url} target="_blank" rel="noreferrer" className="text-[var(--color-brand)] text-xs">
                  {r.url}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
