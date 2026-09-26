import { Link } from "react-router-dom";
import type { Product } from "../../domain/inventory/product.types";
import { estimateIncomingRecipeSuggestion } from "../../domain/recipes/recipeSuggestionOutflowPolicy";
import type { UnestimatedReceivedIngredient } from "../../services/ingredientOutflowEstimateService";

interface Props { entry: UnestimatedReceivedIngredient; products: Product[] }
const quantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const percent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);

export default function ConditionalReceiptOutflow({ entry, products }: Props) {
  const product = products.find((item) => item.id === entry.productId);
  const candidate = product && estimateIncomingRecipeSuggestion(product, products, entry.deliveryDate, {
    receiptLineId: entry.id, reference: entry.receiptReference,
    receivedQuantity: entry.receivedQuantity, unit: entry.unit,
  });
  const suggestion = candidate?.suggestion;
  const ingredient = suggestion?.ingredients.find((item) => item.productId === entry.productId);
  const estimate = candidate?.estimate;

  return <>
    {suggestion && ingredient && estimate ? <section className="conditional-recipe-outflow" aria-label={`Estimation conditionnelle pour ${entry.productName}`}>
      <h4>Estimation conditionnelle · {suggestion.name}</h4>
      <p>Dosage proposé : {quantity(ingredient.quantity)} {ingredient.unit} par lot de {suggestion.yieldPortions} portions. {quantity(entry.receivedQuantity)} {entry.unit} reçus donnent théoriquement {quantity(estimate.possiblePortions)} portions.</p>
      <ul>
        <li>Ventes estimées ({percent(estimate.estimatedSalesShare)}) : {quantity(estimate.estimatedSoldQuantity)} {estimate.unit} · {quantity(estimate.estimatedSoldPortions)} portions</li>
        <li>Pertes estimées ({percent(estimate.estimatedLossShare)}) : {quantity(estimate.estimatedLossQuantity)} {estimate.unit} · {quantity(estimate.estimatedLossPortions)} portions</li>
      </ul>
      <p>Le stock des autres ingrédients n’est pas vérifié. Vérifiez la recette avant création ; rien n’est enregistré.</p>
    </section> : <p>Aucune proposition compatible avec ce produit et son unité n’a pu être calculée ; cette entrée reste à couvrir.</p>}
    <Link to={`/recipes?${new URLSearchParams({ incomingReceiptLineId: entry.id })}`}>
      {suggestion ? "Vérifier et adapter la proposition" : "Voir les recettes pour cette entrée"}
    </Link>
  </>;
}
