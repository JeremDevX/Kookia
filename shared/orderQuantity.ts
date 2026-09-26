/** Purchase conventions, not supplier packaging. Stock/recipe/receipt quantities stay exact. */
export interface OrderProduct {
  unit: string;
  name?: string;
  category?: string;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function getOrderStep(product: OrderProduct): number {
  if (product.unit === "L") return 0.5;
  if (product.unit !== "kg") return 1;
  const name = normalize(product.name ?? "");
  if (/\b(basilic|persil|ciboulette|coriandre|menthe|aneth|estragon|thym|romarin|origan|laurier|poivre|paprika|cumin|cannelle|muscade|curcuma)\b/.test(name)) return 0.05;
  if (/\bbeurre\b/.test(name)) return 0.25;
  const category = normalize(product.category ?? "");
  if (/fromage|charcuterie/.test(category)) return 0.25;
  if (/viande|poisson/.test(category)) return 0.5;
  return 1;
}

export function roundOrderQuantity(quantity: number, step: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  // Avoid an extra pack caused solely by binary arithmetic at an exact multiple.
  return Math.ceil(quantity / step - 1e-9) * (step * 1000) / 1000;
}

export function isOrderQuantity(quantity: number, step: number): boolean {
  return Number.isFinite(quantity) && quantity > 0 && quantity <= 1_000_000 &&
    Math.abs(quantity / step - Math.round(quantity / step)) < 1e-8;
}

export function orderStepLabel(step: number, unit: string): string {
  return `Par pas de ${new Intl.NumberFormat("fr-FR").format(step)} ${unit}`;
}
