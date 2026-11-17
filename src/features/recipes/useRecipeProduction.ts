import { useEffect, useState } from "react";
import { ApiError } from "../../config/api";
import { useToast } from "../../context/ToastContext";
import { getProductions, recordProduction, type Production } from "../../services/recipeService";
import type { Recipe } from "../../types";
import type { ProductionRecord } from "../../types/callbacks";
import { formatLocalISODate } from "../../utils/date";
import type { ServiceSlot } from "../../../shared/serviceCalendar";

interface ProductionJournal {
  revision: number;
  loadedRevision?: number;
  productions: Production[];
  error: string;
}

export function useRecipeProduction(
  needsJournal: boolean,
  refreshRecipes: () => Promise<void>,
  refreshProducts: () => Promise<boolean>,
) {
  const { addToast } = useToast();
  const [journal, setJournal] = useState<ProductionJournal>({ revision: 0, productions: [], error: "" });
  const { revision, loadedRevision, productions, error } = journal;
  const productionLoading = needsJournal && loadedRevision !== revision;
  const refreshProductions = () => setJournal((current) => ({ ...current, revision: current.revision + 1 }));

  useEffect(() => {
    if (!productionLoading) return;
    const controller = new AbortController();
    void getProductions(controller.signal).then((productions) => {
      if (controller.signal.aborted) return;
      setJournal((current) => current.revision === revision
        ? { ...current, loadedRevision: revision, productions, error: "" } : current);
    }, () => {
      if (controller.signal.aborted) return;
      setJournal((current) => current.revision === revision
        ? { ...current, loadedRevision: revision, error: "Historique de production indisponible." } : current);
    });
    return () => controller.abort();
  }, [productionLoading, revision]);

  const addToJournal = (saved: Production) => {
    setJournal((current) => ({ ...current, revision: current.revision + 1,
      productions: [saved, ...current.productions.filter(({ id }) => id !== saved.id)] }));
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

  return {
    productions,
    productionLoading,
    productionError: needsJournal && !productionLoading ? error : "",
    refreshProductions, recordPreparation, confirmProduction, reportRefusal,
  };
}
