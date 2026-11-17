import { useEffect, useState } from "react";
import { ApiError } from "../../config/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../features/auth/context/AuthContext";
import { readPendingAdjustment, submitAdjustment } from "../../features/inventory/pendingAdjustment";
import { getInventoryWorkspace } from "../../services/inventorySessionService";
import type { StockAdjustment } from "../../services/productService";
import type { Product } from "../../types";

export function useProductAdjustment(
  product: Product,
  onAdjustStock: (productId: string, input: StockAdjustment, restaurantId: string) => Promise<void>,
  onRefresh: () => Promise<boolean>,
) {
  const { addToast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  const productId = product.id;
  const [restaurantId, setRestaurantId] = useState("");
  const [pendingAdjustment, setPendingAdjustment] = useState<StockAdjustment | null>(null);
  const [adjustmentError, setAdjustmentError] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjustReason, setAdjustReason] = useState<StockAdjustment["reason"] | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void getInventoryWorkspace().then(({ restaurantId: id }) => {
      if (!active) return;
      const pending = readPendingAdjustment(userId, id, productId);
      setRestaurantId(id);
      setPendingAdjustment(pending);
    }).catch(() => {
      if (active) setAdjustmentError("Impossible de vérifier un ajustement en attente. Rechargez la page.");
    });
    return () => { active = false; };
  }, [productId, userId]);

  const reportLoss = () => {
    setAdjustReason("loss");
    setAdjustAmount("");
  };

  const adjustStock = async () => {
    if (saving || !userId || !restaurantId) return;
    let input = pendingAdjustment;
    if (!input) {
      if (!adjustReason) {
        setAdjustReason("adjustment");
        return;
      }
      const normalized = adjustAmount.trim().replace(",", ".");
      const amount = Number(normalized);
      const delta = adjustReason === "loss" ? -Math.abs(amount) : amount;
      if (!/^[+-]?(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(normalized) || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
        addToast("info", "Ajustement invalide", "Entrez une quantité non nulle, de 3 décimales au maximum (ex. +10 ou -2,5).");
        return;
      }
      if (product.currentStock + delta < 0) {
        addToast("info", "Ajustement invalide", "La quantité retirée dépasse le stock disponible.");
        return;
      }
      input = { operationId: crypto.randomUUID(), delta, reason: adjustReason, expectedStockRevision: product.stockRevision, expectedUnit: product.unit };
    }
    const adjustment = input;
    setSaving(true);
    setAdjustmentError("");
    try {
      await submitAdjustment(userId, restaurantId, productId, adjustment, !!pendingAdjustment, () => onAdjustStock(productId, adjustment, restaurantId));
      setPendingAdjustment(null);
      addToast("success", "Stock ajusté", `${product.name}: ${adjustment.delta > 0 ? "+" : ""}${adjustment.delta} ${product.unit}`);
      setAdjustReason(null);
      setAdjustAmount("");
    } catch (error) {
      try {
        setPendingAdjustment(readPendingAdjustment(userId, restaurantId, productId));
      } catch {
        setAdjustmentError("Impossible de vérifier l’ajustement. Consultez l’historique avant de continuer.");
        return;
      }
      setAdjustmentError(error instanceof Error ? error.message : "Impossible de vérifier l’ajustement.");
      if (error instanceof ApiError && error.details.code === "STOCK_CHANGED") await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return {
    pendingAdjustment, adjustmentError, adjustReason, adjustAmount, setAdjustAmount, reportLoss, adjustStock,
    adjustmentDisabled: saving || !restaurantId,
  };
}
