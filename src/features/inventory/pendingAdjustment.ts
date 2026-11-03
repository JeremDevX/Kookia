import { ApiError } from "../../config/api";
import type { StockAdjustment } from "../../services/productService";

const keyFor = (userId: string, restaurantId: string, productId: string) =>
  `stock-adjustment:${userId}:${restaurantId}:${productId}`;

export function readPendingAdjustment(userId: string, restaurantId: string, productId: string): StockAdjustment | null {
  const saved = localStorage.getItem(keyFor(userId, restaurantId, productId));
  if (saved === null) return null;
  const value: unknown = JSON.parse(saved);
  if (!value || typeof value !== "object" || !("operationId" in value) || typeof value.operationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.operationId) ||
      !("delta" in value) || typeof value.delta !== "number" || !Number.isFinite(value.delta) || value.delta === 0 ||
      !("reason" in value) || (value.reason !== "adjustment" && value.reason !== "loss") ||
      !("expectedStockRevision" in value) || typeof value.expectedStockRevision !== "number" || !Number.isSafeInteger(value.expectedStockRevision) || value.expectedStockRevision < 1 ||
      !("expectedUnit" in value) || !["kg", "L", "dz", "pcs"].includes(String(value.expectedUnit))) {
    throw new Error("Ajustement en attente illisible.");
  }
  return value as StockAdjustment;
}

export async function submitAdjustment(userId: string, restaurantId: string, productId: string, input: StockAdjustment, resume: boolean, send: () => Promise<void>) {
  const key = keyFor(userId, restaurantId, productId);
  if (!navigator.locks) throw new Error("Impossible de protéger cet ajustement. Utilisez un navigateur compatible.");
  await navigator.locks.request(key, async () => {
    const pending = readPendingAdjustment(userId, restaurantId, productId);
    if (pending && (pending.operationId !== input.operationId || pending.delta !== input.delta || pending.reason !== input.reason || pending.expectedStockRevision !== input.expectedStockRevision || pending.expectedUnit !== input.expectedUnit)) {
      throw new Error("Un autre ajustement reste à vérifier. Rechargez la fiche.");
    }
    if (!pending && resume) throw new Error("Cet ajustement a déjà été vérifié. Rechargez la fiche.");
    if (!pending) localStorage.setItem(key, JSON.stringify(input));
    try {
      await send();
      localStorage.removeItem(key);
    } catch (error) {
      if (error instanceof ApiError && ((error.status === 400 && error.details.code === "VALIDATION_ERROR") ||
          (error.status === 409 && ["INSUFFICIENT_STOCK", "STOCK_CHANGED"].includes(error.details.code)))) localStorage.removeItem(key);
      throw error;
    }
  });
}
