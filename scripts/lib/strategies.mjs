// Gerador de estruturas candidatas para o motor de screening — uma
// "receita" por tipo de estratégia (todas as 18 estruturas de risco
// definido do app, exceto CALENDAR_SPREAD, que exige dois vencimentos e
// não é precificável de forma confiável sem uma curva de vol real). Os
// strikes seguem as MESMAS regras estruturais exigidas por checkStructure
// em src/lib/audit.ts — se algo aqui violar essas regras é bug do gerador,
// não da estratégia em si.
//
// Convenção de tamanho: 1 lote-padrão B3 = 100 opções/ações; estruturas de
// razão (ratio) usam 200 na ponta "dobrada", igual à literatura (Vol.3,
// MacielCaps) e ao restante do app.

import { blackScholes, roundStrike } from "./pricing.mjs";

const LOT = 100;

function premiumFor(type, S, K, T, r, sigma) {
  const p = blackScholes(S, K, T, r, sigma, type);
  // Prêmio mínimo de R$0,01 — Black-Scholes pode zerar prêmios muito OTM,
  // o que não acontece na prática (spread bid/ask, valor de tempo residual).
  return Math.max(Math.round(p * 100) / 100, 0.01);
}

function leg(id, type, action, strike, S, T, r, sigma, expiry, quantity) {
  return {
    id,
    type,
    action,
    strike,
    premium: premiumFor(type, S, strike, T, r, sigma),
    quantity,
    expiry,
  };
}

/**
 * Gera as 18 estruturas candidatas para um ticker no preço/volatilidade
 * dados. Retorna { strategyType, legs, requiresUnderlying,
 * underlyingQtySuggested }[] — sem tese, sem prêmio "real": é insumo pro
 * screening mecânico (risco/retorno), não uma recomendação.
 */
export function generateCandidates({ S, sigma, r, T, expiry }) {
  const K = (pct) => roundStrike(S * pct);
  const mk = (type, action, pct, qty) => leg(`${type}-${action}-${pct}`, type, action, K(pct), S, T, r, sigma, expiry, qty);

  const out = [];

  out.push({
    strategyType: "COVERED_CALL",
    legs: [mk("CALL", "VENDA", 1.07, LOT)],
    requiresUnderlying: true,
    underlyingQtySuggested: LOT,
  });

  out.push({
    strategyType: "CASH_SECURED_PUT",
    legs: [mk("PUT", "VENDA", 0.93, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "PROTECTIVE_PUT",
    legs: [mk("PUT", "COMPRA", 0.93, LOT)],
    requiresUnderlying: true,
    underlyingQtySuggested: LOT,
  });

  out.push({
    strategyType: "COLLAR",
    legs: [mk("PUT", "COMPRA", 0.93, LOT), mk("CALL", "VENDA", 1.07, LOT)],
    requiresUnderlying: true,
    underlyingQtySuggested: LOT,
  });

  out.push({
    strategyType: "BULL_CALL_SPREAD",
    legs: [mk("CALL", "COMPRA", 1.0, LOT), mk("CALL", "VENDA", 1.1, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "BEAR_PUT_SPREAD",
    legs: [mk("PUT", "COMPRA", 1.0, LOT), mk("PUT", "VENDA", 0.9, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "BULL_PUT_SPREAD",
    legs: [mk("PUT", "VENDA", 0.93, LOT), mk("PUT", "COMPRA", 0.86, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "BEAR_CALL_SPREAD",
    legs: [mk("CALL", "VENDA", 1.07, LOT), mk("CALL", "COMPRA", 1.14, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "IRON_CONDOR",
    legs: [mk("PUT", "COMPRA", 0.86, LOT), mk("PUT", "VENDA", 0.93, LOT), mk("CALL", "VENDA", 1.07, LOT), mk("CALL", "COMPRA", 1.14, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "IRON_BUTTERFLY",
    legs: [mk("PUT", "COMPRA", 0.9, LOT), mk("PUT", "VENDA", 1.0, LOT), mk("CALL", "VENDA", 1.0, LOT), mk("CALL", "COMPRA", 1.1, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "LONG_STRADDLE",
    legs: [mk("CALL", "COMPRA", 1.0, LOT), mk("PUT", "COMPRA", 1.0, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "LONG_STRANGLE",
    legs: [mk("CALL", "COMPRA", 1.07, LOT), mk("PUT", "COMPRA", 0.93, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "JADE_LIZARD",
    legs: [mk("PUT", "VENDA", 0.9, LOT), mk("CALL", "VENDA", 1.07, LOT), mk("CALL", "COMPRA", 1.14, LOT)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "PUT_RATIO_SPREAD",
    legs: [mk("PUT", "COMPRA", 1.0, LOT), mk("PUT", "VENDA", 0.9, LOT * 2)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "CALL_RATIO_BACKSPREAD",
    legs: [mk("CALL", "VENDA", 1.0, LOT), mk("CALL", "COMPRA", 1.1, LOT * 2)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "PUT_RATIO_BACKSPREAD",
    legs: [mk("PUT", "VENDA", 1.0, LOT), mk("PUT", "COMPRA", 0.9, LOT * 2)],
    requiresUnderlying: false,
  });

  out.push({
    strategyType: "BOOSTER",
    legs: [mk("CALL", "COMPRA", 1.0, LOT), mk("CALL", "VENDA", 1.1, LOT * 2)],
    requiresUnderlying: true,
    underlyingQtySuggested: LOT,
  });

  out.push({
    strategyType: "INVERSE_LINE_BULL",
    legs: [mk("CALL", "COMPRA", 1.0, LOT), mk("PUT", "VENDA", 1.0, LOT)],
    requiresUnderlying: false,
  });

  return out;
}
