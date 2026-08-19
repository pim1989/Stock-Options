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
  maxLoss: number;
  breakevens: number[];
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
  if (legs.length === 0) return { maxGain: 0, maxLoss: 0, breakevens: [] };

  const strikes = legs.map((l) => l.strike);
  const upperBound = Math.max(...strikes, underlying?.entryPrice ?? 0, 1) * 5 + 1000;
  const breakpoints = [...new Set([0, ...strikes, upperBound])].sort((a, b) => a - b);
  const evals = breakpoints.map((price) => ({ price, pl: payoffAt(legs, price, underlying) }));

  const maxGain = Math.max(...evals.map((e) => e.pl));
  const maxLoss = Math.max(0, -Math.min(...evals.map((e) => e.pl)));

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

  return { maxGain, maxLoss, breakevens };
}
