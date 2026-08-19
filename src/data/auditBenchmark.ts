import type { AuditFinding } from "../types/audit";

/**
 * Checagem cruzada com fontes públicas — parte "externa" da auditoria.
 *
 * IMPORTANTE sobre como isso funciona: o RCO Dash roda inteiramente no seu
 * navegador, sem servidor por trás, então ele não sai varrendo a internet
 * sozinho a cada carregamento de página. Essa checagem é feita manualmente
 * (com apoio de busca) toda vez que a safra de recomendações é revisada, e o
 * resultado — junto com a fonte e a data — fica registrado aqui. É uma
 * auditoria real, só que "compilada" na revisão em vez de "ao vivo".
 *
 * Última checagem cruzada: 19/08/2026.
 */
export const AUDIT_BENCHMARK_REVIEWED_AT = "2026-08-19";

export interface BenchmarkSource {
  title: string;
  url: string;
}

export interface BenchmarkEntry {
  findings: AuditFinding[];
  sources: BenchmarkSource[];
}

/** Achados gerais de mercado (não específicos de uma recomendação), exibidos no topo da página de Auditoria. */
export const generalCrossCheck: { note: string; sources: BenchmarkSource[] }[] = [
  {
    note: "Selic em 14,00%-14,25% a.a., Ibovespa sob pressão (~167 mil pontos, saída líquida de estrangeiros de ~R$7,2 bi só em agosto) e rebaixamento da bolsa brasileira pelo JPMorgan — confirmado por múltiplas fontes independentes, consistente com o cenário usado para calibrar esta safra.",
    sources: [
      { title: "Ibovespa recua a 167 mil pontos e renda fixa ganha força com Selic em 14%", url: "https://bpmoney.com.br/mercado/ibovespa-cai-renda-fixa-avanca-selic-14-ipca/" },
      { title: "Ibovespa alcança maior valor em um mês com aposta de corte da Selic em agosto", url: "https://www.acessa.com/economia/2026/07/333313-ibovespa-alcanca-maior-valor-em-um-mes-com-aposta-de-corte-da-selic-em-agosto.html" },
    ],
  },
  {
    note: "PETR4 e ITUB4 aparecem entre as posições de maior peso em carteiras recomendadas públicas de agosto/2026 (XP: 14 ações, PETR4 e ITUB4 com 10% cada, preço-alvo R$63 e R$51 respectivamente; BTG Pactual: ambos presentes na carteira de dividendos) — convergência de direção com o viés de alta adotado nesta safra para os dois papéis.",
    sources: [
      { title: "XP Investimentos define 14 ações para a carteira recomendada de agosto", url: "https://bpmoney.com.br/mercado/acoes/xp-carteira-recomendada-14-acoes-agosto/" },
      { title: "Carteira de Dividendos BTG Pactual 2026: ações e yields [agosto 2026]", url: "https://renovainvest.com.br/blog/carteira-recomendada-de-dividendos-btg-pactual/" },
    ],
  },
  {
    note: "ALERTA relevante: uma fonte de cotação encontrada nesta checagem aponta PETR4 negociando a R$42,60 em agosto/2026, ~13% abaixo do preço de referência de R$49,20 usado nesta safra (que veio de uma leitura anterior sobre o preço-alvo do Itaú BBA). As duas fontes públicas não batem entre si — pode ser defasagem de uma delas. Tratado como alerta em ambas as recomendações de PETR4 abaixo; confira a cotação real antes de montar.",
    sources: [
      { title: "PETR4 hoje: Cotação, indicadores e dividendos", url: "https://investimentos.com.br/ativo/petr4/" },
      { title: "Petrobras (PETR4) supera expectativas no 2T26 e Itaú BBA vê potencial de alta de 30%", url: "https://bpmoney.com.br/mercado/petrobras-petr4-supera-expectativas-no-2t26-e-itau-bba-ve-potencial-de-alta-de-30/" },
    ],
  },
];

const petr4PriceAlert: AuditFinding = {
  code: "benchmark-preco-divergente",
  severity: "ALERTA",
  message:
    "Cotação de referência desta recomendação (R$49,20) diverge de uma fonte pública recente que aponta PETR4 a R$42,60 (~13% abaixo). As fontes públicas não convergem entre si — confira a cotação real no home broker antes de montar; strikes e prêmios podem precisar de ajuste proporcional.",
};

const petr4Convergence: AuditFinding = {
  code: "benchmark-convergencia",
  severity: "OK",
  message:
    "Viés de alta converge com carteiras públicas de agosto/2026: XP inclui PETR4 com 10% de peso e preço-alvo R$63 (próximo aos R$64 do Itaú BBA usados nesta tese); BTG Pactual também mantém PETR4 na carteira de dividendos do mês.",
};

export const externalBenchmark: Record<string, BenchmarkEntry> = {
  "rec-2026-08-petr4-cc": {
    findings: [petr4PriceAlert, petr4Convergence],
    sources: [
      { title: "PETR4 hoje: Cotação, indicadores e dividendos", url: "https://investimentos.com.br/ativo/petr4/" },
      { title: "XP Investimentos define 14 ações para a carteira recomendada de agosto", url: "https://bpmoney.com.br/mercado/acoes/xp-carteira-recomendada-14-acoes-agosto/" },
    ],
  },
  "rec-2026-08-petr4-bullput": {
    findings: [petr4PriceAlert, petr4Convergence],
    sources: [
      { title: "PETR4 hoje: Cotação, indicadores e dividendos", url: "https://investimentos.com.br/ativo/petr4/" },
    ],
  },
  "rec-2026-08-itub4-csp": {
    findings: [
      {
        code: "benchmark-convergencia",
        severity: "OK",
        message:
          "Viés de alta converge com XP (ITUB4 com 10% de peso, preço-alvo R$51,00) e BTG Pactual (ITUB4 presente na carteira de dividendos de agosto/2026).",
      },
      {
        code: "benchmark-preco-nao-confirmado",
        severity: "ALERTA",
        message:
          "Não encontramos, nesta rodada de checagem, uma cotação pública explícita e recente de ITUB4 para confirmar de forma independente o preço de referência usado (R$34,50) — confira a cotação atual antes de operar.",
      },
    ],
    sources: [
      { title: "XP Investimentos define 14 ações para a carteira recomendada de agosto", url: "https://bpmoney.com.br/mercado/acoes/xp-carteira-recomendada-14-acoes-agosto/" },
      { title: "Carteira de Dividendos BTG Pactual 2026: ações e yields [agosto 2026]", url: "https://renovainvest.com.br/blog/carteira-recomendada-de-dividendos-btg-pactual/" },
    ],
  },
  "rec-2026-08-vale3-collar": {
    findings: [
      {
        code: "benchmark-nao-verificado",
        severity: "ALERTA",
        message:
          "Não encontramos, nesta rodada de checagem cruzada, uma carteira pública de agosto/2026 citando VALE3 entre os destaques para confirmar de forma independente a tese ou o preço de referência — trate como não verificado externamente e confira a cotação atual.",
      },
    ],
    sources: [],
  },
  "rec-2026-08-wege3-bullcall": {
    findings: [
      {
        code: "benchmark-nao-verificado",
        severity: "ALERTA",
        message:
          "Não encontramos, nesta rodada de checagem cruzada, uma carteira pública de agosto/2026 citando WEGE3 entre os destaques para confirmar de forma independente a tese ou o preço de referência — trate como não verificado externamente e confira a cotação atual.",
      },
    ],
    sources: [],
  },
  "rec-2026-08-bova11-hedge": {
    findings: [
      {
        code: "benchmark-nao-aplicavel",
        severity: "OK",
        message:
          "Estrutura de hedge sobre o índice (BOVA11), não é o tipo de posição que aparece em carteiras de ações recomendadas — sem benchmark externo direto aplicável. Validada apenas pelos checks internos de matemática e cobertura.",
      },
    ],
    sources: [],
  },
};
