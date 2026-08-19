import type { AuditFinding } from "../types/audit";

/**
 * Registro interno da auditoria qualitativa — NÃO é exibido na interface.
 *
 * Isso é intencional: o usuário pediu que a auditoria rode em background e
 * filtre a carteira ANTES de qualquer recomendação aparecer, não que vire
 * mais uma tela para navegar. Este arquivo é o rastro documentado de uma
 * revisão que vai além de checar a matemática das pernas (isso já é feito
 * de forma 100% determinística em lib/audit.ts) — aqui registramos o
 * julgamento sobre o MÉRITO de cada tese: ciclo de mercado (bull/bear),
 * ciclo de commodity/petróleo, geopolítica, calendário eleitoral,
 * valuation (P/L, P/VP, dividend yield) e leitura técnica. É refeito a
 * cada revisão da safra, com apoio de busca — o app não tem backend e não
 * varre a internet sozinho em tempo real.
 *
 * Uma recomendação só entra em `recommendations.ts` depois de passar por
 * essa revisão — se algo aqui não se sustentasse, a tese/estrutura/preço
 * teria sido corrigida ou a recomendação teria sido descartada antes de
 * publicar, não sinalizada com um aviso na tela.
 *
 * Última revisão: 19/08/2026.
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

/**
 * Achados gerais de ciclo/mercado que embasam toda a safra (não específicos
 * de uma recomendação). Ficam registrados aqui como referência interna.
 */
export const generalCrossCheck: { note: string; sources: BenchmarkSource[] }[] = [
  {
    note: "CICLO DE MERCADO (Ibovespa): alta de longo prazo (~140 mil em ago/2025 até topo histórico de 199.354 pts em abr/2026, +23% no ano na máxima) em CORREÇÃO confirmada de curto/médio prazo — tendência de médio e curto prazo viradas para baixa (BTG Pactual), -6% em agosto, pior sequência de pregões negativos desde 2023, saída líquida de estrangeiros ~R$7,2 bi no mês, rebaixamento pelo JPMorgan. Suporte técnico crítico ~168-172 mil pts (MM50 semanas); resistências em 176.630/180.680 para retomar força compradora. Regime: bull de longo prazo + correção tática — não bear market confirmado.",
    sources: [
      { title: "Ibovespa caminha para a 10ª queda seguida — Money Times", url: "https://www.moneytimes.com.br/ibovespa-cai-6-em-agosto-e-pode-enfrentar-decimo-pregao-negativo-consecutivo-analista-do-btg-comenta-jvka/" },
      { title: "Ibovespa busca suporte de 168 mil após 10ª queda seguida — SpaceMoney", url: "https://www.spacemoney.com.br/investimentos/acoes/ibovespa-hoje/ibovespa-suporte-analise-tecnica/" },
    ],
  },
  {
    note: "CICLO DE PETRÓLEO: Brent rompeu US$100/barril em 23/07/2026 com a escalada da guerra Israel-Irã (risco ao Estreito de Ormuz, ~20% do fluxo marítimo global). Projeção do Commerzbank: recuo para US$80 até o fim do ano, ainda acima do pré-guerra. Leitura: o prêmio de risco geopolítico tende a CEDER — estruturas que monetizam volatilidade elevada (venda de prêmio com risco definido) fazem mais sentido do que apostas direcionais puras em petróleo permanecer no patamar atual. Isso pesou na escolha e no enquadramento de risco das duas recomendações de PETR4.",
    sources: [
      { title: "Preço do petróleo Brent volta a bater US$100 com guerra no Irã — Poder360", url: "https://www.poder360.com.br/poder-internacional/preco-do-petroleo-brent-volta-a-bater-us-100-com-guerra-no-ira/" },
    ],
  },
  {
    note: "CICLO DE COMMODITY (minério de ferro): preço-base 2026 em ~US$100-102/t com viés de alta estrutural (esgotamento de minas antigas — Vale cita ~50 Mt/ano de exaustão no mercado marítimo). Demanda chinesa perto de mínima em 1 ano, mas Vale avalia fundamentos resilientes e demanda ex-China melhorando. Sinal misto — não uma tese unidirecional forte, reforça o uso de estrutura neutra (collar) em vez de aposta bullish pura em VALE3.",
    sources: [
      { title: "Vale vê mercado de minério de ferro resiliente apesar de preço na China em mínima em mais de 1 ano", url: "https://diariodocomercio.com.br/economia/mercado-de-minerio-de-ferro-china/" },
    ],
  },
  {
    note: "CALENDÁRIO ELEITORAL: 1º turno em 04/10/2026, 2º turno (se houver) em 25/10/2026 (TSE). Todos os vencimentos de 19/09 ficam fora dessa janela; o vencimento de 17/10 (WEGE3) cai na semana seguinte ao 1º turno — risco de volatilidade elevada explicitamente registrado na tese dessa recomendação.",
    sources: [
      { title: "Eleições 2026: confira as principais datas do calendário eleitoral — TSE", url: "https://www.tse.jus.br/comunicacao/noticias/2026/Marco/eleicoes-2026-confira-as-principais-datas-do-calendario-eleitoral" },
    ],
  },
  {
    note: "VALUATION cruzado com múltiplos públicos: PETR4 em P/L ≈ 4,1x e P/VP ≈ 1,1x — barata em termos absolutos e frente à própria história, critério clássico de valor (Graham-like: P/L baixo + P/VP perto de 1 + ROE alto de 27,8%). VALE3 em P/L ≈ 29x — esticada para uma commodity cíclica (histórico tende a ser de um dígito a low-teens); é o principal motivo para tratar VALE3 com estrutura neutra (collar) em vez de tese bullish direta nesta safra.",
    sources: [
      { title: "PETR4 - PETROBRAS PN: cotação e indicadores — Status Invest", url: "https://statusinvest.com.br/acoes/petr4" },
      { title: "VALE3 - VALE ON: cotação e indicadores — Status Invest", url: "https://statusinvest.com.br/acoes/vale3" },
    ],
  },
  {
    note: "CONFIRMAÇÃO DE COTAÇÕES: a primeira leitura desta safra usou preços de referência desatualizados (PETR4 R$49,20, VALE3 R$54,80, ITUB4 R$34,50, WEGE3 R$45,00, BOVA11 R$133,00) — divergência de até 33% (VALE3) frente a cotações públicas cruzadas. Todos os preços de referência e as pernas das 6 recomendações foram recalculados a partir das cotações confirmadas nesta revisão (PETR4 R$43,20 · VALE3 R$73,00 · ITUB4 R$38,97 · WEGE3 R$48,60 · BOVA11 R$163,89) antes da publicação. É exatamente o tipo de erro que esta camada de auditoria existe para pegar antes da recomendação chegar ao usuário.",
    sources: [
      { title: "PETR4 hoje: Cotação, indicadores e dividendos", url: "https://investimentos.com.br/ativo/petr4/" },
    ],
  },
];

const literaturaNota: AuditFinding = {
  code: "literatura-checagem",
  severity: "OK",
  message:
    "Estruturas revisadas contra os fundamentos padrão da literatura de opções (cobertura obrigatória, risco sempre definido, prêmio como função de IV/tempo/moneyness) e contra o objetivo declarado de cada estratégia (renda vs. proteção vs. direcional com risco limitado) — nenhuma inconsistência entre o objetivo declarado e a estrutura escolhida.",
};

export const externalBenchmark: Record<string, BenchmarkEntry> = {
  "rec-2026-08-petr4-cc": {
    findings: [
      {
        code: "valuation",
        severity: "OK",
        message: "P/L ≈ 4,1x e P/VP ≈ 1,1x — critério de valor sustenta a tese de manter o ativo em carteira (premissa da covered call).",
      },
      {
        code: "ciclo-petroleo",
        severity: "OK",
        message: "Estrutura escolhida (venda de call coberta) monetiza a IV elevada do petróleo sem depender de o preço do barril continuar subindo — coerente com a expectativa de recuo do prêmio geopolítico (Commerzbank).",
      },
      {
        code: "benchmark-convergencia",
        severity: "OK",
        message: "Viés de alta converge com carteiras públicas de agosto/2026: XP inclui PETR4 com 10% de peso e preço-alvo R$63; BTG Pactual mantém PETR4 na carteira de dividendos do mês.",
      },
      literaturaNota,
    ],
    sources: [
      { title: "PETR4 hoje: Cotação, indicadores e dividendos", url: "https://investimentos.com.br/ativo/petr4/" },
      { title: "XP Investimentos define 14 ações para a carteira recomendada de agosto", url: "https://bpmoney.com.br/mercado/acoes/xp-carteira-recomendada-14-acoes-agosto/" },
    ],
  },
  "rec-2026-08-petr4-bullput": {
    findings: [
      {
        code: "valuation",
        severity: "OK",
        message: "P/L ≈ 4,1x e P/VP ≈ 1,1x dão piso fundamentalista abaixo do strike vendido (40,00, ~7,4% abaixo da referência).",
      },
      {
        code: "ciclo-petroleo",
        severity: "ALERTA",
        message: "Estrutura mais agressiva que a covered call: se a IV cair rápido junto com o petróleo (cenário-base do Commerzbank), o prêmio disponível para vender cai — perfil de risco adequado apenas a quem já aceita volatilidade de petróleo na carteira.",
      },
      literaturaNota,
    ],
    sources: [
      { title: "PETR4 hoje: Cotação, indicadores e dividendos", url: "https://investimentos.com.br/ativo/petr4/" },
    ],
  },
  "rec-2026-08-vale3-collar": {
    findings: [
      {
        code: "valuation",
        severity: "ALERTA",
        message: "P/L ≈ 29x é esticado para uma commodity cíclica — não é o tipo de múltiplo que sustentaria uma tese bullish direta. A escolha de um collar (faixa definida, sem convicção direcional forte) é coerente com esse alerta, não uma aposta de valor.",
      },
      {
        code: "ciclo-commodity",
        severity: "ALERTA",
        message: "Sinais mistos no minério de ferro (demanda chinesa fraca vs. fundamentos de oferta resilientes) — reforça a preferência por estrutura neutra em vez de direcional.",
      },
      literaturaNota,
    ],
    sources: [
      { title: "VALE3 - VALE ON: cotação e indicadores — Status Invest", url: "https://statusinvest.com.br/acoes/vale3" },
      { title: "Vale vê mercado de minério de ferro resiliente apesar de preço na China em mínima em mais de 1 ano", url: "https://diariodocomercio.com.br/economia/mercado-de-minerio-de-ferro-china/" },
    ],
  },
  "rec-2026-08-itub4-csp": {
    findings: [
      {
        code: "benchmark-convergencia",
        severity: "OK",
        message: "Viés de alta converge com XP (ITUB4 com 10% de peso, preço-alvo R$51,00) e BTG Pactual (ITUB4 presente na carteira de dividendos de agosto/2026).",
      },
      {
        code: "ciclo-eleitoral",
        severity: "OK",
        message: "Vencimento (19/09) fica antes do 1º turno (04/10) — janela mais curta de exposição a ruído eleitoral do que a média da safra.",
      },
      literaturaNota,
    ],
    sources: [
      { title: "XP Investimentos define 14 ações para a carteira recomendada de agosto", url: "https://bpmoney.com.br/mercado/acoes/xp-carteira-recomendada-14-acoes-agosto/" },
      { title: "Carteira de Dividendos BTG Pactual 2026: ações e yields [agosto 2026]", url: "https://renovainvest.com.br/blog/carteira-recomendada-de-dividendos-btg-pactual/" },
    ],
  },
  "rec-2026-08-bova11-hedge": {
    findings: [
      {
        code: "ciclo-mercado",
        severity: "OK",
        message: "Consistente com a leitura técnica confirmada de correção de curto/médio prazo no Ibovespa (10 pregões negativos, suporte crítico 168-172 mil pts) — a trava de baixa é hedge tático dentro de um bull market de longo prazo, não uma aposta de bear market estrutural.",
      },
      literaturaNota,
    ],
    sources: [
      { title: "Ibovespa caminha para a 10ª queda seguida — Money Times", url: "https://www.moneytimes.com.br/ibovespa-cai-6-em-agosto-e-pode-enfrentar-decimo-pregao-negativo-consecutivo-analista-do-btg-comenta-jvka/" },
    ],
  },
  "rec-2026-08-wege3-bullcall": {
    findings: [
      {
        code: "ciclo-eleitoral",
        severity: "ALERTA",
        message: "Único vencimento da safra (17/10) que cai DEPOIS do 1º turno das eleições (04/10) — exposição a volatilidade pós-eleitoral que as demais recomendações não têm. Registrado explicitamente na seção de riscos da tese.",
      },
      {
        code: "diversificacao",
        severity: "OK",
        message: "Única tese apoiada no ciclo de juros (não em commodities/petróleo) — funciona como diversificador de fonte de risco frente às demais 5 recomendações da safra.",
      },
      literaturaNota,
    ],
    sources: [],
  },
};
