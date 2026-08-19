import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarkUpdate, Position } from "../types/domain";
import {
  loadDismissedRecommendations,
  loadPaidDarfKeys,
  loadPositions,
  saveDismissedRecommendations,
  savePaidDarfKeys,
  savePositions,
} from "../lib/storage";

function uid(): string {
  return crypto.randomUUID();
}

export function usePortfolio() {
  const [positions, setPositions] = useState<Position[]>(() => loadPositions());
  const [paidDarfKeys, setPaidDarfKeys] = useState<Set<string>>(() => loadPaidDarfKeys());
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(() =>
    loadDismissedRecommendations()
  );

  useEffect(() => savePositions(positions), [positions]);
  useEffect(() => savePaidDarfKeys(paidDarfKeys), [paidDarfKeys]);
  useEffect(() => saveDismissedRecommendations(dismissedRecs), [dismissedRecs]);

  const addPosition = useCallback((position: Omit<Position, "id" | "marks">) => {
    const newPosition: Position = { ...position, id: uid(), marks: [] };
    setPositions((prev) => [newPosition, ...prev]);
    return newPosition.id;
  }, []);

  const addMark = useCallback((positionId: string, mark: Omit<MarkUpdate, "id">) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId ? { ...p, marks: [...p.marks, { ...mark, id: uid() }] } : p
      )
    );
  }, []);

  const closePosition = useCallback(
    (
      positionId: string,
      data: {
        closedDate: string;
        closeReason: Position["closeReason"];
        legExitPremiums: Record<string, number>;
        underlyingExitPrice?: number;
      }
    ) => {
      setPositions((prev) =>
        prev.map((p) => (p.id === positionId ? { ...p, status: "ENCERRADA", ...data } : p))
      );
    },
    []
  );

  const reopenPosition = useCallback((positionId: string) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? {
              ...p,
              status: "ABERTA",
              closedDate: undefined,
              closeReason: undefined,
              legExitPremiums: undefined,
              underlyingExitPrice: undefined,
            }
          : p
      )
    );
  }, []);

  const deletePosition = useCallback((positionId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
  }, []);

  const updatePosition = useCallback((positionId: string, patch: Partial<Position>) => {
    setPositions((prev) => prev.map((p) => (p.id === positionId ? { ...p, ...patch } : p)));
  }, []);

  const toggleDarfPaid = useCallback((key: string) => {
    setPaidDarfKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const dismissRecommendation = useCallback((id: string) => {
    setDismissedRecs((prev) => new Set(prev).add(id));
  }, []);

  const acceptedRecommendationIds = useMemo(
    () => new Set(positions.map((p) => p.recommendationId).filter(Boolean) as string[]),
    [positions]
  );

  return {
    positions,
    setPositions,
    addPosition,
    addMark,
    closePosition,
    reopenPosition,
    deletePosition,
    updatePosition,
    paidDarfKeys,
    toggleDarfPaid,
    dismissedRecs,
    dismissRecommendation,
    acceptedRecommendationIds,
  };
}

export type PortfolioApi = ReturnType<typeof usePortfolio>;
