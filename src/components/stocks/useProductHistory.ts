import { useEffect, useMemo, useState } from "react";
import type { Product, StockCountSummary } from "../../types";
import { getProductStockCounts, getStockMovements, type NewStockCount, type StockCountResult, type StockMovement } from "../../services/productService";

const emptyMovements: StockMovement[] = [];

export function useProductHistory(
  { id, currentStock, stockRevision }: Product,
  onRecordCount: (productId: string, count: NewStockCount) => Promise<StockCountResult>,
) {
  const [movementReloadRevision, setMovementReloadRevision] = useState(0);
  const movementRequest = useMemo(() => ({ id, currentStock, movementReloadRevision }), [id, currentStock, movementReloadRevision]);
  const [movementResult, setMovementResult] = useState<{
    request: typeof movementRequest;
    movements: StockMovement[];
    error: string;
  } | null>(null);
  const [stockCounts, setStockCounts] = useState<StockCountSummary[]>([]);
  const [countHistoryError, setCountHistoryError] = useState("");

  useEffect(() => {
    let active = true;
    void getStockMovements(movementRequest.id).then((movements) => {
      if (active) setMovementResult({ request: movementRequest, movements, error: "" });
    }, () => {
      if (active) setMovementResult({ request: movementRequest, movements: emptyMovements, error: "Historique indisponible." });
    });
    return () => { active = false; };
  }, [movementRequest]);

  useEffect(() => {
    let active = true;
    void getProductStockCounts(id).then((data) => {
      if (!active) return;
      setStockCounts(data);
      setCountHistoryError("");
    }, () => {
      if (active) setCountHistoryError("Historique des comptages indisponible.");
    });
    return () => { active = false; };
  }, [id, stockRevision]);

  const recordCount = async (productId: string, count: NewStockCount) => {
    const result = await onRecordCount(productId, count);
    setStockCounts((previous) => [result.count, ...previous.filter((item) => item.id !== result.count.id)]);
    return result;
  };

  const history = movementResult?.request === movementRequest ? movementResult : null;
  return {
    movements: history?.movements ?? emptyMovements,
    movementsLoaded: !!history,
    historyError: history?.error ?? "",
    reloadMovements: () => setMovementReloadRevision((revision) => revision + 1),
    stockCounts, countHistoryError, recordCount,
  };
}
