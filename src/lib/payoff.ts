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
  underlying?: { qty: number; entryPrice: number }
): PayoffPoint[] {
  return priceRange.map((price) => {
    let pl = 0;
    for (const leg of legs) {
      const intrinsic =
        leg.type === "CALL" ? Math.max(price - leg.strike, 0) : Math.max(leg.strike - price, 0);
      pl += leg.action === "VENDA" ? (leg.premium - intrinsic) * leg.quantity : (intrinsic - leg.premium) * leg.quantity;
    }
    if (underlying) {
      pl += (price - underlying.entryPrice) * underlying.qty;
    }
    return { price, pl, positive: pl >= 0 ? pl : 0, negative: pl < 0 ? pl : 0 };
  });
}
