import Button from "../common/Button";
import type { RecipeSuggestion } from "../../domain/recipes/recipeSuggestionPolicy";
import { estimateSuggestedRecipeOutflow } from "../../domain/recipes/recipeSuggestionOutflowPolicy";
import "./RecipeSuggestionPanel.css";

interface Props {
  suggestion: RecipeSuggestion;
  onReview: (trigger: HTMLButtonElement) => void;
}

const quantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const percent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export default function RecipeSuggestionPanel({ suggestion, onReview }: Props) {
  const estimate = estimateSuggestedRecipeOutflow(suggestion);
  return <section className="recipe-suggestion" aria-labelledby="recipe-suggestion-title">
    <div>
      <h2 id="recipe-suggestion-title">Proposition à vérifier</h2>
      <p>À partir de l’entrée reçue « {suggestion.sourceProductName} »{suggestion.sourceReceipt &&
        ` — ${quantity(suggestion.sourceReceipt.receivedQuantity)} ${suggestion.sourceReceipt.unit} · livraison ${suggestion.sourceReceipt.reference}`},
        pour une prise d’effet proposée au {displayDate(suggestion.effectiveFrom)}.</p>
    </div>
    <div className="recipe-suggestion-summary">
      <h3>{suggestion.name}</h3>
      <p>{suggestion.category} · {suggestion.prepTime} min · lot de {suggestion.yieldPortions} portions</p>
      <ul>{suggestion.ingredients.map((ingredient) => <li key={ingredient.productId}>
        {ingredient.productName} — {quantity(ingredient.quantity)} {ingredient.unit} par lot
      </li>)}</ul>
    </div>
    {estimate && <section className="recipe-suggestion-estimate" aria-labelledby="recipe-suggestion-estimate-title">
      <h3 id="recipe-suggestion-estimate-title">Sorties estimées sous cette proposition</h3>
      <p>À partir des {quantity(estimate.receivedQuantity)} {estimate.unit} reçus,
        le dosage proposé correspond théoriquement à {quantity(estimate.possiblePortions)} portions
        (la recette en prévoit {suggestion.yieldPortions} par lot).</p>
      <ul>
        <li>Ventes estimées ({percent(estimate.estimatedSalesShare)}) : {quantity(estimate.estimatedSoldQuantity)} {estimate.unit} · {quantity(estimate.estimatedSoldPortions)} portions</li>
        <li>Pertes estimées ({percent(estimate.estimatedLossShare)}) : {quantity(estimate.estimatedLossQuantity)} {estimate.unit} · {quantity(estimate.estimatedLossPortions)} portions</li>
      </ul>
      <p>La répartition est une hypothèse de calcul. Les autres ingrédients ne sont pas réputés disponibles ; cette projection n’est pas une vente, une perte ni une sortie de stock enregistrée.</p>
    </section>}
    <p>Vérifiez les ingrédients, les quantités, le rendement et la date avant de créer la recette. Cette projection conditionnelle reste séparée du Bilan des opérations constatées ; créer la recette ne modifie ni le stock ni les ventes ou pertes enregistrées.</p>
    <Button type="button" onClick={(event) => onReview(event.currentTarget)}>Revoir et adapter la recette</Button>
  </section>;
}
