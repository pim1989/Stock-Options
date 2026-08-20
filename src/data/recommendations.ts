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
 *
 *  MACRO / CICLO DE MERCADO
 *  - Selic mantida em 14,00%-14,25% a.a.; IPCA acumulado 12m ~4,44%.
 *  - Ibovespa: mercado de ALTA de longo prazo (subiu de ~140 mil, em
 *    ago/2025, até topo histórico de 199.354 pts em abr/2026, +23% no
 *    ano na máxima) agora em CORREÇÃO de curto/médio prazo — 6% de queda
 *    só em agosto, sequência de pregões negativos (pior desde 2023),
 *    saída líquida de estrangeiros ~R$7,2 bi no mês e rebaixamento da
 *    bolsa brasileira pelo JPMorgan. Suporte técnico crítico na região de
 *    168-172 mil pts (média móvel de 50 semanas); para retomar força
 *    compradora precisaria reconquistar ~176-181 mil.
 *  - Real com viés de depreciação: dólar entre R$5,10-5,20, com
 *    projeções (Morgan Stanley) de R$5,60 no 3T26.
 *  - CALENDÁRIO ELEITORAL 2026: 1º turno em 04/10/2026, 2º turno (se
 *    houver) em 25/10/2026 — histórico de mercado brasileiro mostra
 *    volatilidade elevada nas semanas ao redor do 1º turno. Vencimentos
 *    de setembro (19/09) ficam fora dessa janela; o vencimento de
 *    outubro (17/10) já entra na semana seguinte ao 1º turno.
 *
 *  CICLO DE COMMODITIES
 *  - Petróleo: Brent voltou a romper US$100/barril em 23/07/2026 por
 *    causa da escalada da guerra Israel-Irã (risco ao Estreito de
 *    Ormuz). IMPORTANTE — projeção do Commerzbank é de recuo para
 *    US$80/barril até o fim do ano, com preços ainda acima do
 *    pré-guerra: ou seja, o prêmio de risco geopolítico tende a ceder,
 *    não a se manter. Isso pesa a favor de estruturas que monetizam
 *    volatilidade elevada (venda de prêmio com risco definido) em vez de
 *    apostas direcionais puras em petróleo permanecer nesse patamar.
 *  - Minério de ferro: preço-base para 2026 em torno de US$100-102/t,
 *    com viés de alta pelo esgotamento gradual de minas antigas: Vale
 *    reforça que os fundamentos seguem resilientes apesar da mínima em
 *    1 ano na China.
 *
 *  FUNDAMENTOS (múltiplos, ago/2026)
 *  - PETR4: P/L ≈ 4,1x, P/VP ≈ 1,1x, ROE ≈ 27,8%, dividend yield 12m
 *    ≈ 6,3% — barata em termos absolutos e históricos (referência
 *    clássica de "valor": P/L baixo, P/VP perto de 1, ROE alto).
 *  - VALE3: P/L ≈ 29x (bem acima da média histórica da empresa, que
 *    tende a operar em patamares de commodity cíclica/P/L de um dígito
 *    a low-teens) — múltiplo esticado, não é claramente barata aqui;
 *    reforça preferência por uma estrutura de faixa definida (collar) em
 *    vez de uma aposta bullish agressiva. Dividend yield 12m ≈ 7,7-7,8%.
 *  - ITUB4: lucro recorrente recorde, Basileia 15,4%.
 *  - WEGE3: sem estresse de múltiplos identificado nesta rodada, tese
 *    apoiada no ciclo de corte de Selic, não em valuation.
 *
 *  Cotações de referência adotadas nesta safra (múltiplas fontes
 *  cruzadas): PETR4 R$43,20 · VALE3 R$73,00 · ITUB4 R$38,97 ·
 *  WEGE3 R$48,60 · BOVA11 R$163,89.
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
    underlyingRefPrice: 43.2,
    requiresUnderlying: true,
    underlyingQtySuggested: 1000,
    legs: [
      {
        id: "leg1",
        type: "CALL",
        action: "VENDA",
        underlying: "PETR4",
        series: "PETRJ460 (aprox., strike 46,00, venc. 19/09/2026)",
        strike: 46.0,
        premium: 1.2,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Petróleo Brent voltou a romper US$100/barril (23/07) com a escalada da guerra",
        "Israel-Irã, inflando o prêmio das opções de PETR4 — mas o Commerzbank projeta recuo",
        "para US$80 até o fim do ano: o prêmio de risco tende a ceder, não a se manter. Por",
        "isso a estrutura escolhida monetiza a volatilidade alta agora, em vez de apostar que",
        "o petróleo continua nesse patamar.",
      ].join(" "),
      micro: [
        "PETR4 negocia a P/L ≈ 4,1x e P/VP ≈ 1,1x, com ROE de 27,8% e dividend yield 12m de",
        "6,3% — barata em termos absolutos e históricos. Lucro recorde de R$52,4 bi no 2T26",
        "(EBITDA ajustado US$19 bi, +62% no trimestre) e US$3,4 bi em dividendos anunciados",
        "dão suporte fundamentalista abaixo do preço atual.",
      ].join(" "),
      tecnico: "Strike vendido 6,5% acima da referência, região que já funcionou como resistência técnica nos últimos pregões; IV das calls elevada pelo prêmio geopolítico do petróleo — bom momento para vender contra a posição já em carteira.",
      riscos: [
        "Se o petróleo ceder rapidamente (cenário-base do Commerzbank para o resto do ano) ou",
        "o governo sinalizar nova interferência na política de preços/dividendos da estatal,",
        "PETR4 pode corrigir — a trava é a favor: perda limitada ao recuo do papel, prêmio",
        "amortece a queda. Vencimento (19/09) fica antes do 1º turno das eleições (04/10).",
      ].join(" "),
    },
    maxGain: 4000,
    maxLoss: 42000,
    breakeven: [42.0],
    capitalAlocado: 42000,
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
    underlyingRefPrice: 73.0,
    requiresUnderlying: true,
    underlyingQtySuggested: 1000,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "COMPRA",
        underlying: "VALE3",
        series: "VALEO690 (aprox., strike 69,00, venc. 19/09/2026)",
        strike: 69.0,
        premium: 1.45,
        quantity: 1000,
        expiry: "2026-09-19",
      },
      {
        id: "leg2",
        type: "CALL",
        action: "VENDA",
        underlying: "VALE3",
        series: "VALEJ770 (aprox., strike 77,00, venc. 19/09/2026)",
        strike: 77.0,
        premium: 1.4,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Saída líquida de estrangeiros da bolsa brasileira (~R$7,2 bi em agosto) e",
        "rebaixamento de ações locais pelo JPMorgan aumentam o risco de correção de curto",
        "prazo em nomes ligados a commodities/China. Minério de ferro com preço-base 2026 em",
        "~US$100-102/t e viés de alta estrutural (esgotamento de minas antigas), mas com",
        "demanda chinesa perto de mínima em 1 ano — sinais mistos.",
      ].join(" "),
      micro: [
        "VALE3 negocia a P/L ≈ 29x — bem acima do padrão histórico da empresa como commodity",
        "cíclica, múltiplo esticado que NÃO justifica uma aposta bullish agressiva. É",
        "exatamente por isso que a estrutura escolhida é um collar (faixa definida) em vez de",
        "compra a descoberto ou venda de put: preserva o direito ao provento (dividend yield",
        "12m ~7,7%) sem exigir convicção direcional.",
      ].join(" "),
      tecnico: "Collar de custo baixo (quase zero-cost): prêmio da call vendida praticamente cobre o custo da put de proteção.",
      riscos: [
        "Estratégia neutra por natureza: se o minério e o papel dispararem, o ganho é limitado",
        "ao strike da call (77,00). Valuation esticado (P/L ~29x) é o principal motivo de",
        "cautela aqui — ideal para quem já está posicionado e quer reduzir volatilidade do",
        "book em período de saída de capital estrangeiro e ruído eleitoral.",
      ].join(" "),
    },
    maxGain: 3950,
    maxLoss: 4050,
    breakeven: [73.05],
    capitalAlocado: 73050,
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
    underlyingRefPrice: 38.97,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "VENDA",
        underlying: "ITUB4",
        series: "ITUBO360 (aprox., strike 36,00, venc. 19/09/2026)",
        strike: 36.0,
        premium: 0.8,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Selic em patamar restritivo (14,00%-14,25%) infla o prêmio das opções (custo de",
        "carrego elevado) e favorece bancos na margem financeira. Exposição de ITUB4 ao",
        "câmbio e a commodities é baixa, tornando o papel mais defensivo em ano eleitoral —",
        "o vencimento desta estrutura (19/09) fica antes do 1º turno (04/10).",
      ].join(" "),
      micro: [
        "Itaú reportou lucro recorrente recorde de R$12,4 bi no 2T26 (+7,8% a/a), com Índice",
        "de Basileia de 15,4% (folgado) e anúncio de JCP — sinaliza solidez de capital e",
        "disposição de manter remuneração ao acionista.",
      ].join(" "),
      tecnico: "Strike 7,6% abaixo da referência atual — nível técnico de suporte relevante nos últimos pregões.",
      riscos: [
        "Se ITUB4 cair abaixo de 36,00 no vencimento, o investidor é exercido e compra as",
        "ações a esse preço (efetivo de 35,20 já descontado o prêmio) — risco aceitável para",
        "quem tem interesse em montar posição no banco. Reservar o caixa integral do strike.",
      ].join(" "),
    },
    maxGain: 800,
    maxLoss: 35200,
    breakeven: [35.2],
    capitalAlocado: 35200,
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
    underlyingRefPrice: 163.89,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "COMPRA",
        underlying: "BOVA11",
        series: "BOVAO160 (aprox., strike 160,00, venc. 19/09/2026)",
        strike: 160.0,
        premium: 4.2,
        quantity: 500,
        expiry: "2026-09-19",
      },
      {
        id: "leg2",
        type: "PUT",
        action: "VENDA",
        underlying: "BOVA11",
        series: "BOVAO150 (aprox., strike 150,00, venc. 19/09/2026)",
        strike: 150.0,
        premium: 1.4,
        quantity: 500,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: [
        "Ibovespa está em mercado de ALTA de longo prazo (subiu de ~140 mil em ago/2025 até",
        "topo histórico de 199.354 pts em abr/2026) mas em CORREÇÃO confirmada de curto e",
        "médio prazo: -6% só em agosto, pior sequência de pregões negativos desde 2023,",
        "saída de estrangeiros e início do ciclo eleitoral 2026. Suporte técnico crítico na",
        "região de 168-172 mil pts (média móvel de 50 semanas).",
      ].join(" "),
      micro: "Estrutura sobre o ETF do índice (BOVA11), não sobre um papel específico — pensada para proteger a carteira como um todo durante a correção em curso, não para apostar contra uma empresa.",
      tecnico: "Strikes calibrados para capturar continuação do movimento de correção até a região de suporte, sem depender de rompimento (o índice precisaria reconquistar ~176-181 mil pontos para retomar força compradora).",
      riscos: [
        "É uma trava de débito: perda máxima limitada ao prêmio líquido pago se o mercado",
        "subir ou ficar lateral. Ganho também é limitado (travado entre os strikes) — use como",
        "seguro de carteira, não como aposta direcional isolada. Vencimento fica antes do 1º",
        "turno das eleições (04/10).",
      ].join(" "),
    },
    maxGain: 3600,
    maxLoss: 1400,
    breakeven: [157.2],
    capitalAlocado: 1400,
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
    underlyingRefPrice: 43.2,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "PUT",
        action: "VENDA",
        underlying: "PETR4",
        series: "PETRO400 (aprox., strike 40,00, venc. 19/09/2026)",
        strike: 40.0,
        premium: 1.05,
        quantity: 1000,
        expiry: "2026-09-19",
      },
      {
        id: "leg2",
        type: "PUT",
        action: "COMPRA",
        underlying: "PETR4",
        series: "PETRO370 (aprox., strike 37,00, venc. 19/09/2026)",
        strike: 37.0,
        premium: 0.5,
        quantity: 1000,
        expiry: "2026-09-19",
      },
    ],
    thesis: {
      macro: "Volatilidade implícita das opções de PETR4 segue elevada por causa do prêmio de risco do petróleo (Brent > US$100 pela guerra Israel-Irã) — atrativo para vender prêmio com risco definido pela ponta comprada, mesmo com a expectativa de o prêmio geopolítico ceder ao longo do 2S26.",
      micro: "P/L ≈ 4,1x e P/VP ≈ 1,1x dão suporte fundamentalista a um piso de curto prazo bem abaixo do strike vendido; resultado recorde no 2T26 e política de dividendos agressiva (US$3,4 bi anunciados) reforçam a tese.",
      tecnico: "Strike vendido (40,00) fica ~7,4% abaixo da referência atual, abaixo do suporte técnico mais próximo.",
      riscos: [
        "Estrutura de crédito com risco definido: perda máxima ocorre se PETR4 cair abaixo de",
        "37,00 no vencimento. Perfil agressivo porque monetiza volatilidade geopolítica —",
        "reduza o tamanho da posição se a guerra escalar de forma abrupta ou o petróleo",
        "recuar mais rápido que o esperado, derrubando a IV e o suporte fundamentalista junto.",
      ].join(" "),
    },
    maxGain: 550,
    maxLoss: 2450,
    breakeven: [39.45],
    capitalAlocado: 2450,
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
    underlyingRefPrice: 48.6,
    requiresUnderlying: false,
    legs: [
      {
        id: "leg1",
        type: "CALL",
        action: "COMPRA",
        underlying: "WEGE3",
        series: "WEGEJ485 (aprox., strike 48,50, venc. 17/10/2026)",
        strike: 48.5,
        premium: 2.25,
        quantity: 1000,
        expiry: "2026-10-17",
      },
      {
        id: "leg2",
        type: "CALL",
        action: "VENDA",
        underlying: "WEGE3",
        series: "WEGEJ540 (aprox., strike 54,00, venc. 17/10/2026)",
        strike: 54.0,
        premium: 0.7,
        quantity: 1000,
        expiry: "2026-10-17",
      },
    ],
    thesis: {
      macro: "Mercado precifica corte de Selic ainda em 2026 — ciclo de queda de juros tende a beneficiar desproporcionalmente ações de qualidade/crescimento como WEGE3. É a única estrutura desta safra apoiada no ciclo de juros, não em commodities ou petróleo.",
      micro: "WEG é pouco exposta a petróleo, câmbio direto ou ao ciclo político doméstico — bom contraponto de diversificação frente às posições em PETR4/VALE3/ITUB4 desta safra, todas mais sensíveis a commodities e Selic.",
      tecnico: "Trava de alta com vencimento mais longo (17/10) para dar tempo à tese de corte de juros se confirmar sem pressão de decaimento acelerado do prêmio.",
      riscos: [
        "Débito limitado ao prêmio líquido pago; ganho limitado ao strike da call vendida",
        "(54,00). ATENÇÃO: o vencimento (17/10) cai na semana seguinte ao 1º turno das",
        "eleições (04/10) — a estrutura fica exposta à volatilidade típica desse período.",
        "Se a Selic não cair ou o corte for adiado, a estrutura pode expirar sem valor —",
        "perda já conhecida na montagem.",
      ].join(" "),
    },
    maxGain: 3950,
    maxLoss: 1550,
    breakeven: [50.05],
    capitalAlocado: 1550,
    status: "ATIVA",
  },
];

/**
 * NOTA DE REVISÃO (19/08/2026, mesmo dia): esta safra chegou a incluir uma
 * 7ª recomendação — um Iron Condor em BOVA11, apostando em lateralização —
 * ao lado da trava de baixa acima, que aposta em continuação de queda. As
 * duas foram publicadas juntas com um aviso pedindo para o usuário escolher
 * uma. Isso estava errado: uma carteira recomendada não pode sustentar duas
 * teses de direção contraditórias sobre o mesmo ativo ao mesmo tempo — o
 * aviso empurrava para o usuário uma decisão que é justamente o trabalho
 * desta safra resolver. A evidência técnica levantada (tendência de
 * curto/médio prazo confirmada em baixa, pior sequência de pregões
 * negativos desde 2023, saída de estrangeiros, rebaixamento pelo JPMorgan)
 * sustenta melhor a leitura direcional do que a de lateralização — por
 * isso o Iron Condor foi removido, não a trava de baixa. A capacidade de
 * recomendar Iron Condor continua no app (ver lib/audit.ts) para uma
 * futura safra em que não conflite com uma tese já publicada. Ver também o
 * novo check `checkPortfolioCoherence` em lib/audit.ts, que agora reprova
 * automaticamente qualquer par de recomendações ativas com direções
 * incompatíveis sobre o mesmo ticker — para este erro não se repetir
 * silenciosamente.
 */
