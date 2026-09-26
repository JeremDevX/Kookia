import type { MenuEntry, SheetInput } from "../../../../shared/serviceOperations.js";
import type { ServiceSheetFacts } from "../../../../shared/serviceSheet.js";

interface ProductionFact { id: string; recipeId: string | null; recipeName: string; portions: number; }
interface SaleFact { id: string; saleItemId: string; quantity: number; revision: number; allocationRevision: number; }
interface WasteFact { id: string; productionId: string | null; kind: string; quantity: number; unit: string; }
export interface SheetEvidence {
  menuEntries: MenuEntry[]; menuRevision: number;
  productions: ProductionFact[]; sales: SaleFact[]; wastes: WasteFact[];
  refusals?: ProductionFact[]; unallocatedRefusals?: number;
  recipeNames: Record<string, string>; coverage: ServiceSheetFacts["coverage"];
  unallocatedSales: number; unallocatedProductions: number; staleAllocations: number;
  additionalGaps?: string[];
  dailyRefunds?: ServiceSheetFacts["dailyRefunds"];
}
const round = (value: number) => Math.round(value * 1000) / 1000;
export function reconcileServiceSheet(input: Pick<SheetInput, "planned" | "outcomes" | "substitutions">, evidence: SheetEvidence): ServiceSheetFacts {
  const recipeIds = new Set([...input.planned.map(row => row.recipeId), ...input.outcomes.map(row => row.recipeId),
    ...input.substitutions.flatMap(row => [row.fromRecipeId, row.toRecipeId]),
    ...evidence.productions.flatMap(row => row.recipeId ? [row.recipeId] : []),
    ...(evidence.refusals ?? []).flatMap(row => row.recipeId ? [row.recipeId] : []),
    ...evidence.menuEntries.flatMap(entry => entry.components.map(component => component.recipeId))]);
  const unmappedSales = evidence.sales.filter(sale => !evidence.menuEntries.some(entry => entry.saleItemId === sale.saleItemId))
    .reduce((sum, sale) => sum + sale.quantity, 0);
  const gaps: string[] = [...(evidence.additionalGaps ?? [])];
  if (evidence.coverage !== "complete") gaps.push("Les ventes du service ne sont pas confirmées complètes.");
  if (evidence.unallocatedSales > 0) gaps.push(`${evidence.unallocatedSales} unités vendues restent non ventilées dans la journée.`);
  if (evidence.unallocatedProductions > 0) gaps.push(`${evidence.unallocatedProductions} préparations de la journée restent non ventilées.`);
  if (evidence.staleAllocations > 0) gaps.push("Des ventes corrigées nécessitent une nouvelle ventilation.");
  if (unmappedSales > 0) gaps.push(`${unmappedSales} unités vendues ne correspondent pas à la carte de référence.`);
  if (evidence.productions.some(row => !row.recipeId)) gaps.push("Une préparation n’est pas rattachée à une recette.");
  const complete = gaps.length === 0;
  const lines = [...recipeIds].sort().map(recipeId => {
    const planned = input.planned.find(row => row.recipeId === recipeId)?.portions ?? 0;
    const adjustedPlanned = planned + input.substitutions.filter(row => row.toRecipeId === recipeId).reduce((sum, row) => sum + row.portions, 0)
      - input.substitutions.filter(row => row.fromRecipeId === recipeId).reduce((sum, row) => sum + row.portions, 0);
    const productions = evidence.productions.filter(row => row.recipeId === recipeId);
    const prepared = productions.reduce((sum, row) => sum + row.portions, 0);
    const refused = (evidence.refusals ?? []).filter(row => row.recipeId === recipeId).reduce((sum, row) => sum + row.portions, 0);
    const productionIds = new Set(productions.map(row => row.id));
    const wastes = evidence.wastes.filter(row => row.productionId && productionIds.has(row.productionId));
    const preparationLosses = wastes.filter(row => row.kind === "preparation").map(row => ({ quantity: row.quantity, unit: row.unit }));
    const plateReturns = round(wastes.filter(row => row.kind === "plate_return").reduce((sum, row) => sum + row.quantity, 0));
    const recordedUnsoldWaste = round(wastes.filter(row => row.kind === "unsold").reduce((sum, row) => sum + row.quantity, 0));
    const soldObserved = round(evidence.sales.reduce((sum, sale) => {
      const entry = evidence.menuEntries.find(entry => entry.saleItemId === sale.saleItemId);
      const component = entry?.components.find(component => component.recipeId === recipeId);
      return sum + sale.quantity * (component?.portions ?? 0);
    }, 0));
    const sold = complete ? soldObserved : null;
    const unsold = sold === null ? null : round(prepared - sold);
    const outcome = input.outcomes.find(row => row.recipeId === recipeId);
    const retained = outcome?.retained ?? 0, discarded = outcome?.discarded ?? 0;
    const unexplained = unsold === null ? null : round(unsold - retained - discarded);
    const explanation: string[] = [];
    if (adjustedPlanned < 0) explanation.push("Les substitutions dépassent les portions prévues pour cette recette.");
    if (prepared !== adjustedPlanned) explanation.push(`Écart préparation / plan ajusté : ${prepared - adjustedPlanned} portions.`);
    if (unsold !== null && unsold < 0) explanation.push("Les ventes dépassent les préparations attribuées : vérifier les reports ou les attributions.");
    if (unexplained !== null && unexplained !== 0) explanation.push(`${unexplained} portions restent à rapprocher ; ce n’est pas automatiquement du gaspillage.`);
    if (discarded !== recordedUnsoldWaste) explanation.push("Les portions écartées doivent correspondre aux pertes d’invendus déjà déclarées.");
    if (outcome?.note) explanation.push(outcome.note);
    return { recipeId, recipeName: evidence.recipeNames[recipeId] ?? productions[0]?.recipeName ?? "Recette inconnue", planned,
      adjustedPlanned, prepared, additionalPrepared: Math.max(0, prepared - adjustedPlanned), refused, soldObserved, sold,
      preparationLosses, plateReturns, unsold, retained, discarded, recordedUnsoldWaste, unexplained, explanation };
  });
  return { menuRevision: evidence.menuRevision, productionIds: evidence.productions.map(row => row.id).sort(),
    refusalIds: (evidence.refusals ?? []).map(row => row.id).sort(), unallocatedRefusals: evidence.unallocatedRefusals ?? 0,
    saleRevisions: evidence.sales.map(({ id, revision, allocationRevision }) => ({ id, revision, allocationRevision })).sort((a, b) => a.id.localeCompare(b.id)),
    wasteIds: evidence.wastes.map(row => row.id).sort(), coverage: evidence.coverage, unallocatedSales: evidence.unallocatedSales,
    unallocatedProductions: evidence.unallocatedProductions, unmappedSales, staleAllocations: evidence.staleAllocations, lines, gaps,
    dailyRefunds: evidence.dailyRefunds ?? [] };
}

export function serviceSheetClosureErrors(facts: ServiceSheetFacts) {
  return [...facts.gaps, ...facts.lines.flatMap(line => [
    ...(line.adjustedPlanned < 0 ? [`${line.recipeName} : substitutions supérieures au plan.`] : []),
    ...(line.unsold !== null && line.unsold < 0 ? [`${line.recipeName} : les ventes dépassent les préparations.`] : []),
    ...(line.unexplained !== null && line.unexplained !== 0 ? [`${line.recipeName} : invendus non entièrement rapprochés.`] : []),
    ...(line.discarded !== line.recordedUnsoldWaste ? [`${line.recipeName} : déclarez ou rapprochez les pertes d’invendus avant clôture.`] : []),
  ])];
}
