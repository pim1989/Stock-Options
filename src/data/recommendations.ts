import type { Recommendation } from "../types/domain";

/**
 * Carteira recomendada — safra de 19/08/2026.
 *
 * Preços de ativo-objeto e prêmios de opção abaixo são valores DE
 * REFERÊNCIA, calibrados a partir do cenário fundamentalista descrito em
 * cada tese, e não uma cotação em tempo real (o RCO Dash não tem feed de
 * B3 ao vivo). Confira strikes, prêmios e liquidez das séries reais no
 * home broker antes de montar qualquer estrutura, e ajuste os números na
 * hora de registrar a operação em "Minhas Operações".
 *
 * Cenário-base considerado nesta safra (fontes públicas, ago/2026):
 *  - Selic mantida em 14,00%-14,25% a.a.; IPCA acumulado 12m ~4,44%.
 *  - Ibovespa pressionado (~167 mil pts), saída líquida de estrangeiros
 *    (~R$7,2 bi só em agosto) e rebaixamento da bolsa brasileira pelo
 *    JPMorgan.
 *  - Real com viés de depreciação: dólar entre R$5,10-5,20, com
 *    projeções (Morgan Stanley) de R$5,60 no 3T26, pressionado pelo
 *    ciclo eleitoral 2026.
 *  - Petróleo Brent em forte alta (~US$91) por conta da guerra
 *    Israel-Irã e restrições de exportação russas — favorece Petrobras
 *    no curto prazo, mas é fonte de volatilidade global.
 *  - Petrobras: lucro recorde no 2T26 (R$52,4 bi), EBITDA ajustado
 *    US$19 bi, dividendos robustos; Itaú BBA com preço-alvo PETR4 R$64.
 *  - Itaú: lucro recorrente recorde (R$12,4 bi, +7,8% a/a), Basileia
 *    15,4%, JCP anunciado.
 *  - Ano eleitoral: volatilidade política crescente a partir do 2S26.
 *
 * Filosofia: nenhuma estrutura abaixo tem risco de perda infinita.
 * Toda venda de opção é coberta (por ativo, caixa ou outra opção).
 */
export const recommendations: Recommendation[] = [
  {
    id: "rec-2026-08-petr4-cc",
    ticker: "PETR4",
    companyName: "Petrobras PN",
    strategyType: "COVERED_CALL",
    direction: "ALTA",
    riskProfile: "MODERADO",
    dateIssued: "2026-08-19",
    validUntil: "2026-09-19",
    underlyingRefPrice: 49.2,
    requiresUnderlying: true,
    underlyingQtySuggested: 1000,
    legs: [
      {
        id: "leg1",
        type: "CALL",
        action: "VENDA",
        underlying: "PETR4",
        series: "PETRJ520 (aprox., strike 52,00, venc. 19/09/2026)",
        strike: 52.0,
        premium: 1.35,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Petróleo Brent em torno de US$91/barril, em alta acentuada por causa da guerra",
        "Israel-Irã e da paralisação de ~40% da capacidade de refino russa — cenário favorável",
        "à geração de caixa de petroleiras nos próximos meses, mas com volatilidade elevada",
        "e risco de reversão rápida caso haja sinalização de trégua ou acordo de cessar-fogo.",
      ].join(" "),
      micro: [
        "Petrobras reportou lucro líquido de R$52,4 bi no 2T26 (EBITDA ajustado US$19 bi,",
        "+62% no trimestre) e anunciou US$3,4 bi em dividendos. Itaú BBA mantém preço-alvo de",
        "R$64 (~30% de upside frente à referência atual), reforçando viés construtivo.",
      ].join(" "),
      tecnico: "IV das calls de PETR4 elevada por conta do prêmio de risco geopolítico do petróleo — bom momento para vender volatilidade contra a posição já detida em carteira.",
      riscos: [
        "Se o petróleo ceder rapidamente (ex.: acordo no Oriente Médio) ou o governo sinalizar",
        "nova interferência na política de preços/dividendos da estatal, PETR4 pode corrigir.",
        "A trava é a favor: perda limitada ao recuo do papel, prêmio amortece a queda.",
      ].join(" "),
    },
    maxGain: (52.0 - 49.2) * 1000 + 1.35 * 1000, // valorização até o strike + prêmio
    maxLoss: 49.2 * 1000 - 1.35 * 1000, // custo da ação líquido de prêmio (queda a zero, cenário extremo)
    breakeven: [49.2 - 1.35],
    capitalAlocado: 49.2 * 1000 - 1.35 * 1000,
    status: "ATIVA",
  },
  {
    id: "rec-2026-08-vale3-collar",
    ticker: "VALE3",
    companyName: "Vale ON",
    strategyType: "COLLAR",
    direction: "NEUTRO",
    riskProfile: "CONSERVADOR",
    dateIssued: "2026-08-19",
    validUntil: "2026-09-19",
    underlyingRefPrice: 54.8,
    requiresUnderlying: true,
    underlyingQtySuggested: 1000,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "COMPRA",
        underlying: "VALE3",
        series: "VALEO520 (aprox., strike 52,00, venc. 19/09/2026)",
        strike: 52.0,
        premium: 1.1,
        quantity: 1000,
        expiry: "2026-09-19",
      },
      {
        id: "leg2",
        type: "CALL",
        action: "VENDA",
        underlying: "VALE3",
        series: "VALEJ580 (aprox., strike 58,00, venc. 19/09/2026)",
        strike: 58.0,
        premium: 1.05,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Saída líquida de estrangeiros da bolsa brasileira (~R$7,2 bi em agosto) e",
        "rebaixamento de ações locais pelo JPMorgan aumentam o risco de correção de curto",
        "prazo em nomes ligados a commodities/China, mesmo com fundamentos operacionais ok.",
      ].join(" "),
      micro: [
        "Vale divulga resultado do 2T26 em 30/07 com pagamento de proventos esperado para",
        "setembro/2026 — a estrutura preserva o direito ao provento (ação em carteira) e",
        "trava a faixa de resultado entre a queda protegida e o teto da call vendida.",
      ].join(" "),
      tecnico: "Collar de custo baixo (quase zero-cost): prêmio da call vendida praticamente cobre o custo da put de proteção.",
      riscos: [
        "Estratégia neutra por natureza: se o minério e o papel dispararem, o ganho é limitado",
        "ao strike da call (58,00). Ideal para quem já está posicionado e quer reduzir",
        "volatilidade do book em período de saída de capital estrangeiro e ruído eleitoral.",
      ].join(" "),
    },
    maxGain: (58.0 - 54.8) * 1000 - (1.1 - 1.05) * 1000,
    maxLoss: (54.8 - 52.0) * 1000 + (1.1 - 1.05) * 1000,
    breakeven: [54.8 + (1.1 - 1.05)],
    capitalAlocado: 54.8 * 1000 - (1.05 - 1.1) * 1000,
    status: "ATIVA",
  },
  {
    id: "rec-2026-08-itub4-csp",
    ticker: "ITUB4",
    companyName: "Itaú Unibanco PN",
    strategyType: "CASH_SECURED_PUT",
    direction: "ALTA",
    riskProfile: "CONSERVADOR",
    dateIssued: "2026-08-19",
    validUntil: "2026-09-19",
    underlyingRefPrice: 34.5,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "VENDA",
        underlying: "ITUB4",
        series: "ITUBO320 (aprox., strike 32,00, venc. 19/09/2026)",
        strike: 32.0,
        premium: 0.72,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Selic em patamar restritivo (14,00%-14,25%) infla o prêmio das opções (custo de",
        "carrego elevado) e favorece bancos na margem financeira. Exposição de ITUB4 ao",
        "câmbio e a commodities é baixa, tornando o papel mais defensivo em ano eleitoral.",
      ].join(" "),
      micro: [
        "Itaú reportou lucro recorrente recorde de R$12,4 bi no 2T26 (+7,8% a/a), com Índice",
        "de Basileia de 15,4% (folgado) e anúncio de JCP — sinaliza solidez de capital e",
        "disposição de manter remuneração ao acionista.",
      ].join(" "),
      tecnico: "Strike 32,00 representa desconto de ~7% frente à referência atual — nível técnico de suporte relevante nos últimos pregões.",
      riscos: [
        "Se ITUB4 cair abaixo de 32,00 no vencimento, o investidor é exercido e compra as",
        "ações a esse preço (efetivo de 31,28 já descontado o prêmio) — risco aceitável para",
        "quem tem interesse em montar posição no banco. Reservar o caixa integral do strike.",
      ].join(" "),
    },
    maxGain: 0.72 * 1000,
    maxLoss: (32.0 - 0.72) * 1000, // cenário extremo: ação a zero
    breakeven: [32.0 - 0.72],
    capitalAlocado: 32.0 * 1000 - 0.72 * 1000,
    status: "ATIVA",
  },
  {
    id: "rec-2026-08-bova11-hedge",
    ticker: "BOVA11",
    companyName: "iShares Ibovespa (ETF)",
    strategyType: "BEAR_PUT_SPREAD",
    direction: "BAIXA",
    riskProfile: "MODERADO",
    dateIssued: "2026-08-19",
    validUntil: "2026-09-19",
    underlyingRefPrice: 133.0,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "COMPRA",
        underlying: "BOVA11",
        series: "BOVAO130 (aprox., strike 130,00, venc. 19/09/2026)",
        strike: 130.0,
        premium: 3.4,
        quantity: 500,
        expiry: "2026-09-19",
      },
      {
        id: "leg2",
        type: "PUT",
        action: "VENDA",
        underlying: "BOVA11",
        series: "BOVAO122 (aprox., strike 122,00, venc. 19/09/2026)",
        strike: 122.0,
        premium: 1.15,
        quantity: 500,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Ibovespa em sequência de perdas (-5,9% em sete pregões), saída de estrangeiros e",
        "início do ciclo eleitoral 2026 aumentando o prêmio de risco político. Trava de baixa",
        "com puts funciona como hedge tático e de risco definido para o book agregado.",
      ].join(" "),
      micro: "Estrutura sobre o ETF do índice (BOVA11), não sobre um papel específico — pensada para proteger a carteira como um todo, não para apostar contra uma empresa.",
      tecnico: "Suporte técnico do Ibovespa próximo a 160-162 mil pontos (~122,00 em BOVA11); estrutura calibrada para capturar continuação do movimento até essa região.",
      riscos: [
        "É uma trava de débito: perda máxima limitada ao prêmio líquido pago se o mercado",
        "subir ou ficar lateral. Ganho também é limitado (travado entre os strikes) — use como",
        "seguro de carteira, não como aposta direcional isolada.",
      ].join(" "),
    },
    maxGain: (130.0 - 122.0) * 500 - (3.4 - 1.15) * 500,
    maxLoss: (3.4 - 1.15) * 500,
    breakeven: [130.0 - (3.4 - 1.15)],
    capitalAlocado: (3.4 - 1.15) * 500,
    status: "ATIVA",
  },
  {
    id: "rec-2026-08-petr4-bullput",
    ticker: "PETR4",
    companyName: "Petrobras PN",
    strategyType: "BULL_PUT_SPREAD",
    direction: "ALTA",
    riskProfile: "AGRESSIVO",
    dateIssued: "2026-08-19",
    validUntil: "2026-09-19",
    underlyingRefPrice: 49.2,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "VENDA",
        underlying: "PETR4",
        series: "PETRO460 (aprox., strike 46,00, venc. 19/09/2026)",
        strike: 46.0,
        premium: 1.2,
        quantity: 1000,
        expiry: "2026-09-19",
      },
      {
        id: "leg2",
        type: "PUT",
        action: "COMPRA",
        underlying: "PETR4",
        series: "PETRO430 (aprox., strike 43,00, venc. 19/09/2026)",
        strike: 43.0,
        premium: 0.55,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: "Prêmio de risco do petróleo (guerra Israel-Irã, restrição de exportação russa) mantém a volatilidade implícita das opções de PETR4 elevada — atrativo para vender prêmio com risco definido pela ponta comprada.",
      micro: "Resultado recorde no 2T26 e política de dividendos agressiva (US$3,4 bi anunciados) dão suporte fundamentalista a um piso de curto prazo bem acima do strike vendido.",
      tecnico: "Strike vendido (46,00) fica ~6,5% abaixo da referência atual, região de suporte técnico reforçada pelo fluxo comprador ligado aos dividendos.",
      riscos: [
        "Estrutura de crédito com risco definido: perda máxima ocorre se PETR4 cair abaixo de",
        "43,00 no vencimento. Perfil agressivo porque monetiza volatilidade geopolítica —",
        "reduza o tamanho da posição se a guerra escalar de forma abrupta.",
      ].join(" "),
    },
    maxGain: (1.2 - 0.55) * 1000,
    maxLoss: (46.0 - 43.0) * 1000 - (1.2 - 0.55) * 1000,
    breakeven: [46.0 - (1.2 - 0.55)],
    capitalAlocado: (46.0 - 43.0) * 1000 - (1.2 - 0.55) * 1000,
    status: "ATIVA",
  },
  {
    id: "rec-2026-08-wege3-bullcall",
    ticker: "WEGE3",
    companyName: "WEG ON",
    strategyType: "BULL_CALL_SPREAD",
    direction: "ALTA",
    riskProfile: "MODERADO",
    dateIssued: "2026-08-19",
    validUntil: "2026-10-17",
    underlyingRefPrice: 45.0,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "CALL",
        action: "COMPRA",
        underlying: "WEGE3",
        series: "WEGEJ450 (aprox., strike 45,00, venc. 17/10/2026)",
        strike: 45.0,
        premium: 2.1,
        quantity: 1000,
        expiry: "2026-10-17",
      },
      {
        id: "leg2",
        type: "CALL",
        action: "VENDA",
        underlying: "WEGE3",
        series: "WEGEJ500 (aprox., strike 50,00, venc. 17/10/2026)",
        strike: 50.0,
        premium: 0.65,
        quantity: 1000,
        expiry: "2026-10-17",
      },
    ],
    thesis: {
      macro: "Mercado precifica corte de Selic ainda em 2026 (Ibovespa reagiu com máxima do mês em julho na aposta de corte em agosto) — ciclo de queda de juros tende a beneficiar desproporcionalmente ações de qualidade/crescimento como WEGE3.",
      micro: "WEG é pouco exposta a petróleo, câmbio direto ou ao ciclo político doméstico — bom contraponto de diversificação frente às posições em PETR4/VALE3/ITUB4 desta safra, todas mais sensíveis a commodities e Selic.",
      tecnico: "Trava de alta com vencimento mais longo (out/2026) para dar tempo à tese de corte de juros se confirmar sem pressão de decaimento acelerado do prêmio.",
      riscos: "Débito limitado ao prêmio líquido pago; ganho limitado ao strike da call vendida (50,00). Se a Selic não cair ou o corte for adiado, a estrutura pode expirar sem valor — perda já conhecida na montagem.",
    },
    maxGain: (50.0 - 45.0) * 1000 - (2.1 - 0.65) * 1000,
    maxLoss: (2.1 - 0.65) * 1000,
    breakeven: [45.0 + (2.1 - 0.65)],
    capitalAlocado: (2.1 - 0.65) * 1000,
    status: "ATIVA",
  },
];
