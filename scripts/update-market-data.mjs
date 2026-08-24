#!/usr/bin/env node
// Atualiza src/data/marketSnapshot.json com preço atual e indicadores
// fundamentalistas (P/L, P/VP, Dividend Yield, ROE, Margem Líquida) dos
// tickers em src/data/watchlist.json, usando fontes públicas e gratuitas:
//
//   - Preço: Yahoo Finance (endpoint público de chart, TICKER.SA), com
//     fallback para brapi.dev (aceita token opcional via env BRAPI_TOKEN
//     para maior limite de requisições).
//   - Fundamentos: Fundamentus (fundamentus.com.br/detalhes.php) — fonte
//     não-oficial, mantida pela comunidade; o layout pode mudar sem aviso.
//
// Desenhado para rodar 1x/dia via GitHub Actions (.github/workflows/
// update-market-data.yml), antes da abertura do pregão. Se uma fonte
// falhar para algum ticker, o snapshot ANTERIOR daquele ticker é mantido
// (marcado como `stale: true`) em vez de apagar o dado — o site nunca
// fica sem número por causa de uma falha de rede pontual.
//
// Isto NÃO gera nem altera recomendações de estratégia — só atualiza os
// números de mercado usados para dar contexto (preço atual, indicadores).
// A carteira recomendada em si (estruturas, teses) continua sendo uma
// decisão editorial revisada sob pedido, nunca publicada sem revisão.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watchlistPath = path.join(__dirname, "..", "src", "data", "watchlist.json");
const snapshotPath = path.join(__dirname, "..", "src", "data", "marketSnapshot.json");

const UA = "Mozilla/5.0 (compatible; rco-dash-personal-tracker/1.0; +personal use)";

function parseNumberBR(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace("%", "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function fetchPriceYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?range=1d&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error("Yahoo: preço ausente na resposta");
  const t = result?.meta?.regularMarketTime;
  return { price, asOf: new Date((t ? t * 1000 : Date.now())).toISOString() };
}

async function fetchPriceBrapi(ticker) {
  const token = process.env.BRAPI_TOKEN;
  const url = `https://brapi.dev/api/quote/${ticker}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`brapi HTTP ${res.status}`);
  const json = await res.json();
  const r = json?.results?.[0];
  const price = r?.regularMarketPrice;
  if (typeof price !== "number") throw new Error("brapi: preço ausente na resposta");
  return { price, asOf: new Date().toISOString() };
}

async function fetchPrice(ticker) {
  try {
    return await fetchPriceYahoo(ticker);
  } catch (e1) {
    try {
      return await fetchPriceBrapi(ticker);
    } catch (e2) {
      throw new Error(`Yahoo falhou (${e1.message}); brapi falhou (${e2.message})`);
    }
  }
}

const FUNDAMENTUS_LABELS = {
  pl: "P/L",
  pvp: "P/VP",
  dy: "Div. Yield",
  roe: "ROE",
  margemLiquida: "Marg. Líquida",
};

async function fetchFundamentus(ticker) {
  const url = `https://www.fundamentus.com.br/detalhes.php?papel=${ticker}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Fundamentus HTTP ${res.status}`);
  // A página é servida em ISO-8859-1 (sem charset no header) — decodificar
  // como UTF-8 (padrão do fetch) transforma acentos em lixo. Também: cada
  // rótulo vem com um ícone de dica ("?") colado na frente do texto (ex.:
  // "?Marg. Líquida"), por isso removemos esse prefixo antes de comparar.
  const buf = await res.arrayBuffer();
  const html = new TextDecoder("iso-8859-1").decode(buf);
  const $ = cheerio.load(html);

  const out = {};
  for (const [key, label] of Object.entries(FUNDAMENTUS_LABELS)) {
    const labelCell = $("td")
      .filter((_, el) => $(el).text().trim().replace(/^\?+\s*/, "") === label)
      .first();
    const raw = labelCell.length ? labelCell.next("td").text().trim() : "";
    out[key] = parseNumberBR(raw);
  }
  // Se nenhum campo foi encontrado, o layout provavelmente mudou — melhor
  // sinalizar como falha do que salvar um objeto todo em branco.
  if (Object.values(out).every((v) => v === null)) {
    if (process.env.DEBUG_FUNDAMENTUS) {
      const cells = $("td")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .slice(0, 80);
      console.warn(`[debug ${ticker}] primeiras células <td> não-vazias:`, JSON.stringify(cells));
    }
    throw new Error("nenhum indicador reconhecido na página (layout pode ter mudado)");
  }
  return out;
}

async function loadJsonSafe(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const watchlist = JSON.parse(await fs.readFile(watchlistPath, "utf8"));
  const previous = await loadJsonSafe(snapshotPath, { generatedAt: null, quotes: {} });
  const quotes = { ...previous.quotes };
  const warnings = [];

  for (const { ticker, isETF } of watchlist) {
    let priceInfo = null;
    try {
      priceInfo = await fetchPrice(ticker);
    } catch (e) {
      warnings.push(`${ticker}: preço indisponível — ${e.message}`);
    }

    let fund = null;
    if (!isETF) {
      try {
        fund = await fetchFundamentus(ticker);
      } catch (e) {
        warnings.push(`${ticker}: fundamentos indisponíveis — ${e.message}`);
      }
    }

    const prevQuote = quotes[ticker] ?? {};
    quotes[ticker] = {
      price: priceInfo?.price ?? prevQuote.price,
      priceAsOf: priceInfo?.asOf ?? prevQuote.priceAsOf ?? null,
      pl: fund?.pl ?? prevQuote.pl ?? null,
      pvp: fund?.pvp ?? prevQuote.pvp ?? null,
      dy: fund?.dy ?? prevQuote.dy ?? null,
      roe: fund?.roe ?? prevQuote.roe ?? null,
      margemLiquida: fund?.margemLiquida ?? prevQuote.margemLiquida ?? null,
      fundamentalsAsOf: fund ? new Date().toISOString() : prevQuote.fundamentalsAsOf ?? null,
      stale: !priceInfo,
    };

    // Pausa curta entre tickers pra não martelar os sites com requisições
    // em rajada — é 1x/dia, não precisa de pressa.
    await new Promise((r) => setTimeout(r, 800));
  }

  const snapshot = { generatedAt: new Date().toISOString(), quotes };
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(`Snapshot salvo em ${path.relative(process.cwd(), snapshotPath)} (${Object.keys(quotes).length} ticker(s)).`);
  if (warnings.length) {
    console.warn("\nAvisos (dado anterior mantido onde a busca falhou):");
    for (const w of warnings) console.warn(`  - ${w}`);
  }
}

main().catch((err) => {
  console.error("Falha ao atualizar dados de mercado:", err);
  process.exit(1);
});
