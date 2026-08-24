// Porta em JS simples (sem TypeScript) do essencial de src/lib/payoff.ts,
// pra uso pelo motor de screening (scripts/screening-report.mjs), que
// roda com `node` puro, sem build step. Mantenha a lógica em sincronia
// com src/lib/payoff.ts se aquele arquivo mudar.

export function payoffAt(legs, price, underlying) {
  let pl = 0;
  for (const leg of legs) {
    const intrinsic = leg.type === "CALL" ? Math.max(price - leg.strike, 0) : Math.max(leg.strike - price, 0);
    pl += leg.action === "VENDA" ? (leg.premium - intrinsic) * leg.quantity : (intrinsic - leg.premium) * leg.quantity;
  }
  if (underlying) {
    pl += (price - underlying.entryPrice) * underlying.qty;
  }
  return pl;
}

export function netSlopeAboveHighestStrike(legs, underlying) {
  let slope = underlying?.qty ?? 0;
  for (const leg of legs) {
    if (leg.type !== "CALL") continue;
    slope += (leg.action === "COMPRA" ? 1 : -1) * leg.quantity;
  }
  return slope;
}

export function computePayoffExtremes(legs, underlying, refPrice) {
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

  const breakevens = [];
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
