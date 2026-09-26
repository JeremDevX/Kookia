import type { Product, Recipe } from "../../types";

export function recipeStockWarnings(recipe: Recipe, products: Product[]) {
  return recipe.ingredients.flatMap(ingredient => {
    const product = products.find(product => product.id === ingredient.productId);
    if (!product) return [];
    const warnings: string[] = [];
    if (product.lotStockMismatch) warnings.push(`${product.name} : les lots et le stock physique ne correspondent pas ; rapprochez-les avant production.`);
    if ((product.expiredStock ?? 0) > 0) warnings.push(`${product.name} : ${product.expiredStock} ${product.unit} à échéance dépassée, exclus de la faisabilité.`);
    if ((product.unknownExpiryStock ?? 0) > 0) warnings.push(`${product.name} : ${product.unknownExpiryStock} ${product.unit} sans échéance renseignée, à vérifier par le chef avant utilisation.`);
    if (product.availableForProduction === undefined) warnings.push(`${product.name} : faisabilité calculée sur le solde historique ; échéances non qualifiées.`);
    return warnings;
  });
}
