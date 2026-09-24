export interface BaselineSale {
  serviceDate: string;
  saleItemId: string;
  saleItemName: string;
  quantity: number;
  source: "manual" | "csv" | "demo_simulation";
}

export interface BaselineServiceDay {
  serviceDate: string;
  status: "open" | "closed";
  coverage: "complete" | "partial" | "missing";
  source: "recorded" | "demo_simulation" | "mixed";
}

export interface BaselineRecipeMapping {
  saleItemId: string;
  recipeId: string;
  revision: number;
  effectiveFrom: string;
  knownAt: string;
  portionsPerItem: number;
}

export interface BaselineRecipeVersion {
  recipeId: string;
  version: number;
  effectiveFrom: string | null;
  knownAt: string;
  name: string;
  yieldPortions: number;
  ingredients: Array<{ productId: string; productName: string; unit: string; quantity: number }>;
}

const HISTORY_DAYS = 28;
const LOOKBACK_DAYS = 7;
const EVALUATION_DAYS = 7;
const day = (date: string, offset: number) =>
  new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10);
const mean = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const round = (value: number) => Math.round(value * 10) / 10;
const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

function mappingAt(saleItemId: string, serviceDate: string, knownThrough: string, mappings: BaselineRecipeMapping[]) {
  return mappings.filter((mapping) => mapping.saleItemId === saleItemId && mapping.effectiveFrom <= serviceDate &&
    mapping.knownAt <= knownThrough)
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom) || right.revision - left.revision)[0] ?? null;
}

function recipeVersionAt(recipeId: string, serviceDate: string, knownThrough: string, versions: BaselineRecipeVersion[]) {
  return versions.filter((version) => version.recipeId === recipeId && version.effectiveFrom !== null &&
    version.effectiveFrom <= serviceDate && version.knownAt <= knownThrough)
    .sort((left, right) => right.effectiveFrom!.localeCompare(left.effectiveFrom!) || right.version - left.version)[0] ?? null;
}

function recipeProjection(saleItemId: string, serviceDate: string, knownThrough: string, quantity: number,
  mappings: BaselineRecipeMapping[], versions: BaselineRecipeVersion[]) {
  const mapping = mappingAt(saleItemId, serviceDate, knownThrough, mappings);
  if (!mapping) return { status: "unmapped" as const, reason: "Aucune correspondance validée à cette date." };
  const version = recipeVersionAt(mapping.recipeId, serviceDate, knownThrough, versions);
  if (!version) return { status: "recipe_version_unknown" as const, mappingRevision: mapping.revision,
    mappingEffectiveFrom: mapping.effectiveFrom, portionsPerItem: mapping.portionsPerItem,
    reason: "Aucune version de recette avec date d’effet connue à cette date." };
  const portions = quantity * mapping.portionsPerItem;
  return { status: "mapped" as const, recipeId: mapping.recipeId, recipeName: version.name,
    mappingRevision: mapping.revision, mappingEffectiveFrom: mapping.effectiveFrom,
    portionsPerItem: mapping.portionsPerItem, recipeVersion: version.version,
    recipeEffectiveFrom: version.effectiveFrom!, forecastPortions: roundQuantity(portions),
    ingredients: version.ingredients.map((ingredient) => ({ productId: ingredient.productId,
      productName: ingredient.productName, unit: ingredient.unit,
      quantity: roundQuantity(ingredient.quantity * portions / version.yieldPortions) })) };
}

function recipeUsageBacktest(saleItemId: string, dates: string[], quantities: number[],
  mappings: BaselineRecipeMapping[], versions: BaselineRecipeVersion[]) {
  const start = HISTORY_DAYS - EVALUATION_DAYS;
  let mappedDays = 0, missingMappingDays = 0, missingDatedRecipeDays = 0;
  const byIngredient = new Map<string, { productId: string; productName: string; unit: string; errors: number[]; actual: number }>();
  const versionsUsed: Array<{ serviceDate: string; mappingRevision: number; mappingEffectiveFrom: string;
    recipeId: string; recipeName: string; recipeVersion: number; recipeEffectiveFrom: string }> = [];
  for (let target = start; target < HISTORY_DAYS; target++) {
    const serviceDate = dates[target];
    const mapping = mappingAt(saleItemId, serviceDate, serviceDate, mappings);
    if (!mapping) { missingMappingDays++; continue; }
    const version = recipeVersionAt(mapping.recipeId, serviceDate, serviceDate, versions);
    if (!version) { missingDatedRecipeDays++; continue; }
    mappedDays++;
    versionsUsed.push({ serviceDate, mappingRevision: mapping.revision, mappingEffectiveFrom: mapping.effectiveFrom,
      recipeId: mapping.recipeId, recipeName: version.name, recipeVersion: version.version, recipeEffectiveFrom: version.effectiveFrom! });
    const forecast = mean(quantities.slice(target - LOOKBACK_DAYS, target));
    const actual = quantities[target];
    for (const ingredient of version.ingredients) {
      const projected = ingredient.quantity * forecast * mapping.portionsPerItem / version.yieldPortions;
      const consumed = ingredient.quantity * actual * mapping.portionsPerItem / version.yieldPortions;
      const row = byIngredient.get(ingredient.productId) ?? { productId: ingredient.productId,
        productName: ingredient.productName, unit: ingredient.unit, errors: [], actual: 0 };
      row.errors.push(Math.abs(projected - consumed)); row.actual += consumed;
      byIngredient.set(ingredient.productId, row);
    }
  }
  return { days: EVALUATION_DAYS, mappedDays, missingMappingDays, missingDatedRecipeDays, versionsUsed,
    ingredients: [...byIngredient.values()].map((row) => ({ productId: row.productId, productName: row.productName,
      unit: row.unit, meanAbsoluteError: roundQuantity(row.errors.reduce((sum, value) => sum + value, 0) / row.errors.length),
      weightedAbsolutePercentageError: row.actual === 0 ? null : roundQuantity(row.errors.reduce((sum, value) => sum + value, 0) / row.actual * 100) }))
      .sort((left, right) => left.productName.localeCompare(right.productName, "fr")) };
}

export function evaluateSalesBaseline(sales: BaselineSale[], serviceDays: BaselineServiceDay[], asOfDate: string,
  recipeMappings: BaselineRecipeMapping[] = [], recipeVersions: BaselineRecipeVersion[] = []) {
  const dates = Array.from({ length: HISTORY_DAYS }, (_, index) => day(asOfDate, index - HISTORY_DAYS + 1));
  const inWindow = sales.filter((sale) => dates.includes(sale.serviceDate));
  const hasRecordedSales = inWindow.some((sale) => sale.source !== "demo_simulation");
  const hasSimulationSales = inWindow.some((sale) => sale.source === "demo_simulation");
  const windowServiceDays = serviceDays.filter((serviceDay) => dates.includes(serviceDay.serviceDate));
  const hasRecordedCalendar = windowServiceDays.some((serviceDay) => serviceDay.source === "recorded");
  const hasSimulationCalendar = windowServiceDays.some((serviceDay) => serviceDay.source === "demo_simulation");
  const mixedSourceWindow = windowServiceDays.some((serviceDay) => serviceDay.source === "mixed") ||
    (hasRecordedSales && hasSimulationSales) || (hasRecordedCalendar && hasSimulationCalendar) ||
    (hasRecordedSales && hasSimulationCalendar) || (hasSimulationSales && hasRecordedCalendar);
  const serviceDayByDate = new Map(serviceDays.map((serviceDay) => [serviceDay.serviceDate, serviceDay]));
  const incompleteDates = dates.filter((date) => serviceDayByDate.get(date)?.coverage !== "complete");
  const completeServiceDays = dates.filter((date) => serviceDayByDate.get(date)?.coverage === "complete").length;
  const openServiceDays = dates.filter((date) => {
    const serviceDay = serviceDayByDate.get(date);
    return serviceDay?.status === "open" && serviceDay.coverage === "complete";
  }).length;
  const byItem = new Map<string, { saleItemId: string; saleItemName: string; byDate: Map<string, number> }>();
  let excludedSimulationRows = 0;
  for (const sale of inWindow) {
    if (hasRecordedSales && sale.source === "demo_simulation") { excludedSimulationRows++; continue; }
    const item = byItem.get(sale.saleItemId) ?? { saleItemId: sale.saleItemId, saleItemName: sale.saleItemName,
      byDate: new Map<string, number>() };
    item.byDate.set(sale.serviceDate, (item.byDate.get(sale.serviceDate) ?? 0) + sale.quantity);
    byItem.set(sale.saleItemId, item);
  }
  const items = incompleteDates.length || mixedSourceWindow ? [] : [...byItem.values()].flatMap((item) => {
    const quantities = dates.map((date) => item.byDate.get(date) ?? 0);
    const errors = Array.from({ length: EVALUATION_DAYS }, (_, index) => {
      const target = HISTORY_DAYS - EVALUATION_DAYS + index;
      return Math.abs(mean(quantities.slice(target - LOOKBACK_DAYS, target)) - quantities[target]);
    });
    const actualTotal = quantities.slice(-EVALUATION_DAYS).reduce((sum, value) => sum + value, 0);
    return [{ saleItemId: item.saleItemId, saleItemName: item.saleItemName,
      forecastQuantity: mean(quantities.slice(-LOOKBACK_DAYS)),
      backtest: { from: dates[HISTORY_DAYS - EVALUATION_DAYS], to: asOfDate,
        days: EVALUATION_DAYS, meanAbsoluteError: round(errors.reduce((sum, error) => sum + error, 0) / EVALUATION_DAYS),
        weightedAbsolutePercentageError: actualTotal === 0 ? null : round(errors.reduce((sum, error) => sum + error, 0) / actualTotal * 100) },
      recipeProjection: recipeProjection(item.saleItemId, day(asOfDate, 1), day(asOfDate, 1),
        mean(quantities.slice(-LOOKBACK_DAYS)), recipeMappings, recipeVersions),
      recipeBacktest: recipeUsageBacktest(item.saleItemId, dates, quantities, recipeMappings, recipeVersions) }];
  }).sort((a, b) => a.saleItemName.localeCompare(b.saleItemName, "fr"));
  const provenance = hasRecordedSales ? hasSimulationSales ? "mixed" : "recorded_sales"
    : hasSimulationSales ? "demo_simulation" : "recorded_sales";
  return {
    provenance, model: "rolling_mean_7_v1" as const,
    asOfDate, forecastDate: day(asOfDate, 1), historyFrom: dates[0],
    requiredConsecutiveDays: HISTORY_DAYS, lookbackDays: LOOKBACK_DAYS, evaluationDays: EVALUATION_DAYS,
    completeServiceDays, openServiceDays, incompleteDates,
    status: byItem.size === 0 ? "no_data" as const : incompleteDates.length > 0 || mixedSourceWindow ? "insufficient_history" as const : "experimental" as const,
    observedItemCount: byItem.size, excludedSimulationRows, mixedSourceWindow, items,
  };
}
