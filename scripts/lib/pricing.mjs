// Precificação de opções ESTIMADA para o motor de screening (ver
// scripts/screening-report.mjs). Isto NÃO é uma cotação real de mercado —
// o app não tem feed de opções da B3 (grade de strikes/prêmios/IV por
// série é dado pago). É uma aproximação Black-Scholes (europeia) usada
// só para avaliar mecanicamente se uma estrutura vale a pena olhar mais
// de perto, nunca para decidir preço de entrada de verdade.

/** Aproximação de erf (Abramowitz & Stegun 7.1.26), erro máx. ~1.5e-7. */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

/** Função de distribuição acumulada da normal padrão. */
export function normCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Preço Black-Scholes (europeu) de uma call ou put.
 * S = preço à vista, K = strike, T = prazo em anos, r = taxa livre de
 * risco anual, sigma = volatilidade anual (proxy — ver estimateVolatility).
 */
export function blackScholes(S, K, T, r, sigma, type) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return Math.max(type === "CALL" ? S - K : K - S, 0);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === "CALL") {
    return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  }
  return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}

/**
 * Proxy grosseiro de volatilidade anualizada a partir da faixa de 52
 * semanas (Fundamentus) — NÃO é volatilidade implícita real (que exigiria
 * a grade de opções, dado pago). É só (máx-mín)/preço médio do período,
 * uma medida de dispersão histórica, suficiente pra diferenciar um papel
 * "parado" de um "agitado" no screening. Limitado a uma faixa razoável
 * pra evitar prêmios absurdos quando o dado de origem for ruidoso.
 */
export function estimateVolatility(min52, max52) {
  if (!min52 || !max52 || min52 <= 0 || max52 <= min52) return 0.35; // fallback conservador
  const mid = (min52 + max52) / 2;
  const proxy = (max52 - min52) / mid;
  return Math.min(Math.max(proxy, 0.2), 0.8);
}

/** Arredonda um strike para um incremento "redondo" plausível, function do preço. */
export function roundStrike(value) {
  const step = value >= 100 ? 5 : value >= 20 ? 1 : value >= 5 ? 0.5 : 0.1;
  return Math.round(value / step) * step;
}
