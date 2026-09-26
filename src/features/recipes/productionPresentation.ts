import type { Production } from "../../services/recipeService";

const SCENARIO_OPERATION_PREFIX = "restaurant-simulation-v1:";

export function isScenarioProduction(operationId: string) {
  return operationId.startsWith(SCENARIO_OPERATION_PREFIX);
}

export function productionNoteForDisplay(production: Pick<Production, "operationId" | "notes">) {
  if (isScenarioProduction(production.operationId) || !production.notes.trim()) return null;
  return production.notes;
}
