import type { Position } from "../types/domain";

const KEYS = {
  positions: "rco-dash:positions:v1",
  darfPaid: "rco-dash:darf-paid:v1",
  dismissedRecs: "rco-dash:dismissed-recs:v1",
};

export function loadPositions(): Position[] {
  try {
    const raw = localStorage.getItem(KEYS.positions);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]): void {
  localStorage.setItem(KEYS.positions, JSON.stringify(positions));
}

export function loadPaidDarfKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(KEYS.darfPaid);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function savePaidDarfKeys(keys: Set<string>): void {
  localStorage.setItem(KEYS.darfPaid, JSON.stringify([...keys]));
}

export function loadDismissedRecommendations(): Set<string> {
  try {
    const raw = localStorage.getItem(KEYS.dismissedRecs);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveDismissedRecommendations(ids: Set<string>): void {
  localStorage.setItem(KEYS.dismissedRecs, JSON.stringify([...ids]));
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  positions: Position[];
  darfPaid: string[];
  dismissedRecs: string[];
}

export function exportBackup(): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    positions: loadPositions(),
    darfPaid: [...loadPaidDarfKeys()],
    dismissedRecs: [...loadDismissedRecommendations()],
  };
}

export function importBackup(payload: BackupPayload): void {
  savePositions(payload.positions ?? []);
  savePaidDarfKeys(new Set(payload.darfPaid ?? []));
  saveDismissedRecommendations(new Set(payload.dismissedRecs ?? []));
}
