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
 */
export function computePayoffExtremes(legs: OptionLeg[], underlying?: UnderlyingPosition): PayoffExtremes {
  if (legs.length === 0) return { maxGain: 0, maxGainUnlimited: false, maxLoss: 0, breakevens: [] };

  const strikes = legs.map((l) => l.strike);
  const upperBound = Math.max(...strikes, underlying?.entryPrice ?? 0, 1) * 5 + 1000;
  const breakpoints = [...new Set([0, ...strikes, upperBound])].sort((a, b) => a - b);
  const evals = breakpoints.map((price) => ({ price, pl: payoffAt(legs, price, underlying) }));

  const maxGain = Math.max(...evals.map((e) => e.pl));
  const maxLoss = Math.max(0, -Math.min(...evals.map((e) => e.pl)));
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

  return { maxGain, maxGainUnlimited, maxLoss, breakevens };
}

/** true quando as pernas têm vencimentos diferentes (estrutura de calendário) —
 * nesse caso o payoff no vencimento curto depende do valor a mercado da perna
 * de vencimento longo, que só um modelo de precificação calcula (não o valor
 * intrínseco no vencimento usado aqui). O gráfico de payoff não é confiável
 * para essas estruturas — ver PayoffChart. */
export function hasMixedExpiries(legs: OptionLeg[]): boolean {
  return new Set(legs.map((l) => l.expiry)).size > 1;
}
