import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../config/api";
import { useToast } from "../../context/ToastContext";
import { getProductions, recordProduction, type Production } from "../../services/recipeService";
import type { Recipe } from "../../types";
import type { ProductionRecord } from "../../types/callbacks";
import { formatLocalISODate } from "../../utils/date";
import type { ServiceSlot } from "../../../shared/serviceCalendar";

export function useRecipeProduction(refreshRecipes: () => Promise<void>, refreshProducts: () => Promise<boolean>) {
  const { addToast } = useToast();
  const [productions, setProductions] = useState<Production[]>([]);
  const [productionError, setProductionError] = useState("");
  const pending = useRef<Promise<Production[]> | null>(null);
  const refreshProductions = useCallback(() => {
    const request = getProductions();
    pending.current = request;
    return request.then((data) => {
      if (pending.current === request) {
        setProductions(data);
        setProductionError("");
      }
    }, () => {
      if (pending.current === request) setProductionError("Historique de production indisponible.");
    });
  }, []);

  useEffect(() => {
    void refreshProductions();
    return () => { pending.current = null; };
  }, [refreshProductions]);

  const addToJournal = (saved: Production) => {
    setProductions((previous) => [saved, ...previous.filter(({ id }) => id !== saved.id)]);
    void refreshProductions();
  };

  const recordPreparation = async (data: ProductionRecord, operationId: string) => {
    const saved = await recordProduction({ operationId, recipeName: data.recipeName,
      portions: Number(data.portions), prepTime: Number(data.prepTime || 0), notes: data.notes,
      date: formatLocalISODate(new Date(data.date)), serviceSlot: data.serviceSlot ?? null, kind: "record" });
    addToJournal(saved);
    addToast("success", "Préparation ajoutée au journal",
      `${data.portions} portions de ${data.recipeName} notées. Stock inchangé.`);
  };

  const confirmProduction = async (recipe: Recipe, quantity: number, operationId: string, serviceSlot: string | null) => {
    try {
      const saved = await recordProduction({ operationId, recipeId: recipe.id, expectedRecipeRevision: recipe.version,
        recipeName: recipe.name, portions: quantity, prepTime: recipe.prepTime,
        notes: "", date: formatLocalISODate(), serviceSlot, kind: "production" });
      addToJournal(saved);
      await Promise.all([refreshRecipes(), refreshProducts()]);
      addToast("success", "Production enregistrée", `${quantity} portions de ${recipe.name} enregistrées. Ingrédients déduits du stock.`);
    } catch (cause) {
      if (cause instanceof ApiError && ["INSUFFICIENT_STOCK", "INSUFFICIENT_LOT_STOCK", "LOT_STOCK_MISMATCH"].includes(cause.details.code)) {
        await refreshProducts();
      }
      throw cause;
    }
  };

  const reportRefusal = async (recipe: Recipe, portions: number, operationId: string, serviceSlot: ServiceSlot | null) => {
    const saved = await recordProduction({ operationId, recipeId: recipe.id, expectedRecipeRevision: recipe.version,
      recipeName: recipe.name, portions, prepTime: 0, notes: "", date: formatLocalISODate(), serviceSlot, kind: "refusal" });
    addToJournal(saved);
    addToast("success", "Demandes refusées enregistrées", `${portions} demande${portions > 1 ? "s" : ""} pour ${recipe.name}.`);
  };

  return { productions, productionError, refreshProductions, recordPreparation, confirmProduction, reportRefusal };
}
