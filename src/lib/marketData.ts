import marketSnapshot from "../data/marketSnapshot.json";

/**
 * Snapshot de mercado (preço + indicadores fundamentalistas) atualizado
 * automaticamente 1x/dia, antes da abertura do pregão, por um workflow do
 * GitHub Actions (.github/workflows/update-market-data.yml) que roda
 * scripts/update-market-data.mjs. Fontes: Yahoo Finance / brapi.dev (preço)
 * e Fundamentus (indicadores) — públicas, gratuitas e não-oficiais.
 *
 * Isto é só contexto de mercado ao vivo — NÃO substitui o preço de
 * referência auditado de cada recomendação (`underlyingRefPrice`), que é o
 * preço contra o qual a estrutura, os strikes e a matemática foram
 * validados. Mudar aquele valor sozinho, sem uma nova revisão, deixaria a
 * recomendação desalinhada do que foi de fato auditado.
 */
export interface TickerQuote {
  price?: number;
  priceAsOf?: string | null;
  pl?: number | null;
  pvp?: number | null;
  dy?: number | null;
  roe?: number | null;
  margemLiquida?: number | null;
  /** Mínima e máxima de 52 semanas (Fundamentus) — usadas como proxy de
   * volatilidade histórica pelo motor de screening (scripts/screening-
   * report.mjs), não exibidas diretamente na UI. */
  min52?: number | null;
  max52?: number | null;
  fundamentalsAsOf?: string | null;
  /** true quando a última tentativa de buscar preço falhou e este é um valor antigo mantido. */
  stale?: boolean;
}

interface MarketSnapshot {
  generatedAt: string | null;
  quotes: Record<string, TickerQuote>;
}

const snapshot = marketSnapshot as MarketSnapshot;

export function getQuote(ticker: string): TickerQuote | undefined {
  return snapshot.quotes[ticker];
}

export function marketSnapshotGeneratedAt(): string | null {
  return snapshot.generatedAt;
}
