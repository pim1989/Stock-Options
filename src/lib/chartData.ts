import type { Position } from "../types/domain";
import { capitalAlocado, computeOpenPL, computeRealizedPL } from "./calculations";

export interface TimelinePoint {
  date: string;
  cumulative: number;
  label: string;
}

/** Linha de resultado realizado acumulado, ordenado por data de encerramento. */
export function buildRealizedTimeline(positions: Position[]): TimelinePoint[] {
  const closed = positions
    .filter((p) => p.status === "ENCERRADA" && p.closedDate)
    .sort((a, b) => a.closedDate!.localeCompare(b.closedDate!));

  let cumulative = 0;
  return closed.map((p) => {
    const { totalRealized } = computeRealizedPL(p);
    cumulative += totalRealized;
    return { date: p.closedDate!, cumulative, label: p.ticker };
  });
}

export interface AllocationSlice {
  ticker: string;
  capital: number;
}

export function buildAllocationByTicker(positions: Position[]): AllocationSlice[] {
  const open = positions.filter((p) => p.status === "ABERTA");
  const map = new Map<string, number>();
  for (const p of open) {
    const capital = capitalAlocado(p);
    map.set(p.ticker, (map.get(p.ticker) ?? 0) + capital);
  }
  return [...map.entries()]
    .map(([ticker, capital]) => ({ ticker, capital }))
    .sort((a, b) => b.capital - a.capital);
}

export interface OpenPositionBar {
  label: string;
  pl: number;
}

export function buildOpenPLBars(positions: Position[]): OpenPositionBar[] {
  return positions
    .filter((p) => p.status === "ABERTA")
    .map((p) => ({ label: p.ticker, pl: computeOpenPL(p).totalOpenPL }))
    .sort((a, b) => b.pl - a.pl);
}
