import type { OptionLeg } from "../types/domain";

export interface PayoffPoint {
  price: number;
  positive: number;
  negative: number;
  pl: number;
}

/** Gera uma faixa de preços do ativo-objeto centrada na referência informada. */
export function buildPriceRange(refPrice: number, steps = 41, spreadPct = 0.3): number[] {
  if (!refPrice || refPrice <= 0) return [];
  const min = refPrice * (1 - spreadPct);
  const max = refPrice * (1 + spreadPct);
  const arr: number[] = [];
  for (let i = 0; i < steps; i++) {
    arr.push(min + ((max - min) * i) / (steps - 1));
  }
  return arr;
}

export interface UnderlyingPosition {
  qty: number;
  entryPrice: number;
}

/** Resultado da estrutura completa (pernas + ativo-objeto) para UM preço hipotético no vencimento. */
export function payoffAt(legs: OptionLeg[], price: number, underlying?: UnderlyingPosition): number {
  let pl = 0;
  for (const leg of legs) {
    const intrinsic =
      leg.type === "CALL" ? Math.max(price - leg.strike, 0) : Math.max(leg.strike - price, 0);
    pl += leg.action === "VENDA" ? (leg.premium - intrinsic) * leg.quantity : (intrinsic - leg.premium) * leg.quantity;
  }
  if (underlying) {
    pl += (price - underlying.entryPrice) * underlying.qty;
  }
  return pl;
}

/**
 * Resultado da estrutura NO VENCIMENTO (valor intrínseco das opções),
 * incluindo o ativo-objeto quando a estrutura o exige. É o "gráfico de
 * payoff" clássico de opções — não é uma projeção de preço, é a
 * matemática do resultado para cada preço hipotético do ativo no
 * vencimento.
 */
export function computePayoffAtExpiry(
  legs: OptionLeg[],
  priceRange: number[],
  underlying?: UnderlyingPosition
): PayoffPoint[] {
  return priceRange.map((price) => {
    const pl = payoffAt(legs, price, underlying);
    return { price, pl, positive: pl >= 0 ? pl : 0, negative: pl < 0 ? pl : 0 };
  });
}

export interface PayoffExtremes {
  maxGain: number;
  /** true quando o ganho cresce sem limite acima do maior strike (ex.: ratio backspread) —
   * `maxGain` nesse caso é só o valor no ponto mais distante avaliado, não um teto real. */
  maxGainUnlimited: boolean;
  maxLoss: number;
  /**
   * Preço do ativo-objeto em que a perda máxima ocorre. `0` significa que o
   * pior cenário é o ativo indo a zero (típico de venda coberta, cash-secured
   * put, collar...) — um evento extremo/pouco provável, bem diferente de uma
   * queda comum. Um valor positivo (normalmente um strike) é o preço exato
   * que, se rompido, realiza a perda máxima — o caso típico de travas e
   * estruturas de crédito, onde esse rompimento costuma ser bem mais
   * plausível dentro do prazo da estrutura. Mostrar isso (e a distância em
   * % do preço atual) é o que separa "perda máxima teórica" de "quão fácil
   * é essa perda acontecer".
   */
  maxLossAtPrice: number;
  breakevens: number[];
}

/**
 * Inclinação líquida do payoff para preços ACIMA do maior strike envolvido —
 * ou seja, quanto a estrutura ganha (se positivo) ou perde (se negativo) para
 * cada R$1 adicional de alta do ativo, uma vez que todas as opções já estão
 * "dentro" de sua região linear.
 *
 * É o teste matemático exato de risco ilimitado na alta: como toda call vira
 * uma reta de inclinação +1 (comprada) ou -1 (vendida) acima do seu strike, e
 * o ativo-objeto (se possuído) contribui +1 por unidade, a soma dessas
 * inclinações não pode nunca ser negativa numa estrutura seguramente coberta.
 * Se for negativa, existe uma call vendida "sobrando" sem cobertura — venda a
 * descoberto de verdade, risco de perda sem limite. Puts nunca geram risco
 * ilimitado (o ativo não vai abaixo de zero), por isso não entram aqui.
 */
export function netSlopeAboveHighestStrike(legs: OptionLeg[], underlying?: UnderlyingPosition): number {
  let slope = underlying?.qty ?? 0;
  for (const leg of legs) {
    if (leg.type !== "CALL") continue;
    slope += (leg.action === "COMPRA" ? 1 : -1) * leg.quantity;
  }
  return slope;
}

/**
 * Ganho máximo, perda máxima e ponto(s) de equilíbrio EXATOS de uma estrutura,
 * calculados analiticamente (não por amostragem). Como o payoff de qualquer
 * combinação de opções + ativo-objeto é linear por partes, com "quinas" apenas
 * nos strikes, os extremos globais só podem ocorrer nos strikes ou nos limites
 * (preço 0 e preço muito alto) — por isso avaliar só esses pontos é suficiente
 * e exato, sem depender de uma faixa de amostragem arbitrária.
 *
 * @param refPrice preço de referência do ativo (ex.: cotação atual) usado
 * apenas para desempatar `maxLossAtPrice` quando a perda máxima é um platô
 * (mesmo valor em vários preços — comum em travas de crédito). Não afeta
 * `maxGain`/`maxLoss`/`breakevens`.
 */
export function computePayoffExtremes(
  legs: OptionLeg[],
  underlying?: UnderlyingPosition,
  refPrice?: number
): PayoffExtremes {
  if (legs.length === 0) {
    return { maxGain: 0, maxGainUnlimited: false, maxLoss: 0, maxLossAtPrice: 0, breakevens: [] };
  }

  const strikes = legs.map((l) => l.strike);
  const upperBound = Math.max(...strikes, underlying?.entryPrice ?? 0, 1) * 5 + 1000;
  const breakpoints = [...new Set([0, ...strikes, upperBound])].sort((a, b) => a - b);
  const evals = breakpoints.map((price) => ({ price, pl: payoffAt(legs, price, underlying) }));

  const maxGain = Math.max(...evals.map((e) => e.pl));
  const worstPL = Math.min(...evals.map((e) => e.pl));
  const maxLoss = Math.max(0, -worstPL);
  // O pior resultado pode ocorrer em MAIS de um preço ao mesmo tempo — o caso
  // clássico é uma trava de crédito, cuja perda máxima fica "achatada" (mesmo
  // valor) em toda a região além do strike comprado, inclusive em preço 0.
  // Nesse empate, o preço 0 (ação a zero, evento extremo) NÃO é o gatilho
  // relevante — o gatilho real é a borda do platô mais próxima da cotação
  // atual, pois é aí que a perda máxima passa a valer. Só reportamos "só se
  // a ação for a zero" quando 0 for o ÚNICO ponto no mínimo.
  let maxLossAtPrice = 0;
  if (maxLoss > 0) {
    const eps = Math.max(0.01, Math.abs(worstPL) * 1e-6);
    const tied = evals.filter((e) => Math.abs(e.pl - worstPL) <= eps);
    if (tied.length === 1) {
      maxLossAtPrice = tied[0].price;
    } else {
      const anchor = refPrice ?? underlying?.entryPrice ?? tied[tied.length - 1].price;
      maxLossAtPrice = tied.reduce(
        (best, e) => (Math.abs(e.price - anchor) < Math.abs(best.price - anchor) ? e : best),
        tied[0]
      ).price;
    }
  }
  const maxGainUnlimited = netSlopeAboveHighestStrike(legs, underlying) > 0;

  const breakevens: number[] = [];
  for (let i = 0; i < evals.length - 1; i++) {
    const a = evals[i];
    const b = evals[i + 1];
    const crosses = (a.pl <= 0 && b.pl >= 0) || (a.pl >= 0 && b.pl <= 0);
    if (crosses && a.pl !== b.pl) {
      const t = -a.pl / (b.pl - a.pl);
      breakevens.push(Math.round((a.price + t * (b.price - a.price)) * 100) / 100);
    }
  }

  return { maxGain, maxGainUnlimited, maxLoss, maxLossAtPrice, breakevens };
}

/** true quando as pernas têm vencimentos diferentes (estrutura de calendário) —
 * nesse caso o payoff no vencimento curto depende do valor a mercado da perna
 * de vencimento longo, que só um modelo de precificação calcula (não o valor
 * intrínseco no vencimento usado aqui). O gráfico de payoff não é confiável
 * para essas estruturas — ver PayoffChart. */
export function hasMixedExpiries(legs: OptionLeg[]): boolean {
  return new Set(legs.map((l) => l.expiry)).size > 1;
}
