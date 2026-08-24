#!/usr/bin/env node
// Motor de screening mecânico: testa TODAS as estratégias de risco
// definido (as mesmas 18 que o app já suporta, exceto calendário — ver
// scripts/lib/strategies.mjs) em TODOS os tickers de
// src/data/watchlist.json, usando o preço e a faixa de 52 semanas mais
// recentes de src/data/marketSnapshot.json (atualizado 1x/dia por
// update-market-data.mjs).
//
// Isto é o "sempre avaliar, descartar em background o que não virar
// recomendação" pedido pelo usuário: roda por completo a cada execução,
// mas o resultado NÃO aparece em nenhuma tela do app — fica só neste
// snapshot (src/data/screeningSnapshot.json), pra consulta/auditoria
// interna na hora de montar ou revisar a carteira recomendada de verdade.
//
// IMPORTANTE — o que isto NÃO é:
//  - Não é uma cotação real de opções (prêmios são estimados via
//    Black-Scholes com um proxy de volatilidade — ver scripts/lib/
//    pricing.mjs), então os números de capital/ganho/perda aqui são
//    ORDEM DE GRANDEZA, não preço de tela.
//  - Não gera nem substitui a TESE de uma recomendação (headline,
//    catalisadores, invalidação) — isso continua exigindo pesquisa de
//    verdade, feita sob pedido. O screening só garante que toda
//    combinação ticker×estratégia foi mecanicamente considerada antes de
//    qualquer uma virar recomendação, e que nenhuma é descartada por
//    "complexidade" — só por risco/retorno mecanicamente ruim.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estimateVolatility } from "./lib/pricing.mjs";
import { generateCandidates } from "./lib/strategies.mjs";
import { computePayoffExtremes, netSlopeAboveHighestStrike } from "./lib/payoff.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const watchlistPath = path.join(root, "src", "data", "watchlist.json");
const snapshotPath = path.join(root, "src", "data", "marketSnapshot.json");
const outPath = path.join(root, "src", "data", "screeningSnapshot.json");

// Taxa livre de risco anual usada na precificação — Selic vigente (ago/2026).
// Sem feed automático de Selic ainda; ajustar manualmente se mudar muito.
const RISK_FREE_RATE = 0.14;
const EXPIRY_DAYS = 30;

function netCredit(legs) {
  let c = 0;
  for (const l of legs) c += l.action === "VENDA" ? l.premium * l.quantity : -l.premium * l.quantity;
  return c;
}

// Espelha o switch de capitalAlocado em src/lib/calculations.ts — ver lá
// para a versão "fonte da verdade"; mantenha as duas em sincronia.
function capitalFor(strategyType, legs, S, underlyingQty) {
  switch (strategyType) {
    case "COVERED_CALL":
    case "COLLAR":
    case "PROTECTIVE_PUT": {
      const stockCost = (underlyingQty ?? 0) * S;
      return Math.max(stockCost - netCredit(legs), stockCost * 0.01);
    }
    case "CASH_SECURED_PUT": {
      const sold = legs.find((l) => l.action === "VENDA" && l.type === "PUT");
      const reserved = sold ? sold.strike * sold.quantity : 0;
      return Math.max(reserved - netCredit(legs), 0);
    }
    case "BULL_CALL_SPREAD":
    case "BEAR_PUT_SPREAD":
      return Math.max(-netCredit(legs), 0);
    case "BULL_PUT_SPREAD":
    case "BEAR_CALL_SPREAD": {
      const width = Math.abs(legs[0].strike - legs[1].strike);
      const qty = Math.min(...legs.map((l) => l.quantity));
      return Math.max(width * qty - netCredit(legs), 0);
    }
    default:
      return null; // resolvido via maxLoss (computePayoffExtremes) pelo chamador
  }
}

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function main() {
  const watchlist = await loadJson(watchlistPath);
  const snapshot = await loadJson(snapshotPath);
  const T = EXPIRY_DAYS / 365;
  const expiry = new Date(Date.now() + EXPIRY_DAYS * 86400000).toISOString().slice(0, 10);

  const tickers = {};
  const summaryRows = [];
  const skipped = [];

  for (const { ticker, companyName, isETF } of watchlist) {
    const q = snapshot.quotes?.[ticker];
    if (!q || typeof q.price !== "number" || q.price <= 0) {
      skipped.push(`${ticker}: sem preço no snapshot ainda (rode update-market-data.mjs antes)`);
      continue;
    }
    const S = q.price;
    const sigma = estimateVolatility(q.min52, q.max52);

    const underlying = { qty: 100, entryPrice: S };
    const candidates = generateCandidates({ S, sigma, r: RISK_FREE_RATE, T, expiry }).map((c) => {
      const und = c.requiresUnderlying ? underlying : undefined;
      const slope = netSlopeAboveHighestStrike(c.legs, und);
      if (slope < 0) {
        // Não deveria acontecer nunca — indicaria bug no gerador (ver
        // scripts/lib/strategies.mjs), não um problema da estratégia.
        console.warn(`[ALERTA] ${ticker}/${c.strategyType}: gerou exposição a descoberto (slope=${slope}) — bug no gerador.`);
      }
      const extremes = computePayoffExtremes(c.legs, und, S);
      const capital = capitalFor(c.strategyType, c.legs, S, c.underlyingQtySuggested) ?? extremes.maxLoss;
      // Quando maxGainUnlimited, o maxGain calculado é só o valor num ponto
      // distante arbitrário (ver payoff.mjs) — não um teto real. Um
      // "retorno potencial %" sobre isso seria um número fabricado, então
      // essas estruturas ficam de fora do ranking por retorno (são
      // marcadas como convexas/sem teto, não penalizadas nem infladas).
      const retornoPotencial = !extremes.maxGainUnlimited && capital > 0 ? extremes.maxGain / capital : null;
      const riscoRetorno = !extremes.maxGainUnlimited && extremes.maxLoss > 0 ? extremes.maxGain / extremes.maxLoss : null;
      return {
        strategyType: c.strategyType,
        legs: c.legs,
        requiresUnderlying: c.requiresUnderlying,
        underlyingQtySuggested: c.underlyingQtySuggested,
        capitalAlocado: Math.round(capital * 100) / 100,
        maxGain: Math.round(extremes.maxGain * 100) / 100,
        maxGainUnlimited: extremes.maxGainUnlimited,
        maxLoss: Math.round(extremes.maxLoss * 100) / 100,
        maxLossAtPrice: extremes.maxLossAtPrice,
        breakevens: extremes.breakevens,
        retornoPotencial,
        riscoRetorno,
        definedRisk: slope >= 0,
      };
    });

    tickers[ticker] = { companyName, isETF: !!isETF, price: S, sigmaProxy: Math.round(sigma * 1000) / 1000, candidates };

    for (const c of candidates) {
      summaryRows.push({ ticker, strategyType: c.strategyType, retornoPotencial: c.retornoPotencial, capital: c.capitalAlocado });
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    params: { riskFreeRate: RISK_FREE_RATE, expiryDays: EXPIRY_DAYS, expiry, lot: 100 },
    note:
      "Screening mecânico com prêmios ESTIMADOS (Black-Scholes + proxy de volatilidade por faixa de 52 semanas) — não é cotação real de opções. Não substitui a tese de uma recomendação. Ver comentário no topo de screening-report.mjs.",
    tickers,
  };
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`Screening salvo em ${path.relative(root, outPath)} — ${Object.keys(tickers).length} ticker(s) × ${Object.values(tickers)[0]?.candidates.length ?? 0} estratégia(s).`);
  if (skipped.length) {
    console.warn("\nIgnorados nesta rodada:");
    for (const s of skipped) console.warn(`  - ${s}`);
  }

  const top = summaryRows
    .filter((r) => r.retornoPotencial !== null && Number.isFinite(r.retornoPotencial))
    .sort((a, b) => b.retornoPotencial - a.retornoPotencial)
    .slice(0, 15);
  console.log("\nTop 15 por retorno potencial sobre capital (maxGain/capital) — só ordem de grandeza mecânica, não é recomendação:");
  for (const r of top) {
    console.log(`  ${r.ticker.padEnd(7)} ${r.strategyType.padEnd(22)} retorno≈${(r.retornoPotencial * 100).toFixed(0).padStart(4)}%  capital≈R$${r.capital.toLocaleString("pt-BR")}`);
  }
}

main().catch((err) => {
  console.error("Falha no screening:", err);
  process.exit(1);
});
