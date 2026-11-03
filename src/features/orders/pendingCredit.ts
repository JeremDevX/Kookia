import { ApiError } from "../../config/api";
import type { PurchaseCreditInput } from "../../services/orderService";

const keyFor = (userId: string, restaurantId: string, orderId: string) =>
  `purchase-credit:${userId}:${restaurantId}:${orderId}`;

function validatePendingCredit(value: unknown): PurchaseCreditInput {
  if (!value || typeof value !== "object" || !("operationId" in value) || typeof value.operationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.operationId) ||
      !("receiptId" in value) || typeof value.receiptId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.receiptId) ||
      !("reference" in value) || typeof value.reference !== "string" || !value.reference.trim() || value.reference.length > 120 ||
      !("amount" in value) || typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 1_000_000 ||
      Math.abs(value.amount * 100 - Math.round(value.amount * 100)) > 1e-7 ||
      !("reason" in value) || typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 500 ||
      Object.keys(value).length !== 5) {
    throw new Error("Vérifiez la référence, le montant et le motif de l’avoir.");
  }
  return value as PurchaseCreditInput;
}

export function readPendingCredit(userId: string, restaurantId: string, orderId: string): PurchaseCreditInput | null {
  const saved = localStorage.getItem(keyFor(userId, restaurantId, orderId));
  if (saved === null) return null;
  try { return validatePendingCredit(JSON.parse(saved) as unknown); }
  catch { throw new Error("L’avoir en attente est illisible. Vérifiez les pièces avant de continuer."); }
}

export const duplicateCreditError = (error: unknown) => error instanceof ApiError && error.status === 409 && error.details.code === "CREDIT_ALREADY_RECORDED";

export const definitiveCreditError = (error: unknown) => error instanceof ApiError && (
  (error.status === 400 && error.details.code === "VALIDATION_ERROR") ||
  (error.status === 404 && error.details.code === "RECEIPT_NOT_FOUND") ||
  (error.status === 409 && error.details.code === "CREDIT_ALREADY_RECORDED")
);

export async function submitPendingCredit(userId: string, restaurantId: string, orderId: string, input: PurchaseCreditInput,
  resume: boolean, onPending: () => void, send: () => Promise<unknown>) {
  validatePendingCredit(input);
  const key = keyFor(userId, restaurantId, orderId);
  if (!navigator.locks) throw new Error("Impossible de protéger cet avoir. Utilisez un navigateur compatible.");
  await navigator.locks.request(key, async () => {
    const pending = readPendingCredit(userId, restaurantId, orderId);
    if (pending && (pending.operationId !== input.operationId || pending.receiptId !== input.receiptId ||
        pending.reference !== input.reference || pending.amount !== input.amount || pending.reason !== input.reason)) {
      throw new Error("Un autre avoir reste à vérifier. Rechargez la page.");
    }
    if (!pending && resume) throw new Error("Cet avoir a déjà été vérifié. Rechargez la page.");
    if (!pending) localStorage.setItem(key, JSON.stringify(input));
    onPending();
    try {
      await send();
      localStorage.removeItem(key);
    } catch (error) {
      if ((!resume && definitiveCreditError(error)) || duplicateCreditError(error)) localStorage.removeItem(key);
      throw error;
    }
  });
}
