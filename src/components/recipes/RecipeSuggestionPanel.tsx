import Button from "../common/Button";
import type { RecipeSuggestion } from "../../domain/recipes/recipeSuggestionPolicy";
import "./RecipeSuggestionPanel.css";

interface Props {
  suggestion: RecipeSuggestion;
  onReview: (trigger: HTMLButtonElement) => void;
}

const quantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export default function RecipeSuggestionPanel({ suggestion, onReview }: Props) {
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
    <p>Vérifiez les ingrédients, les quantités, le rendement et la date avant de créer la recette. Les autres produits ne sont pas réputés disponibles. Tant que vous ne la créez pas, cette proposition n’entre pas dans les estimations ; sa création n’enregistre aucune vente, perte ou sortie de stock.</p>
    <Button type="button" onClick={(event) => onReview(event.currentTarget)}>Revoir et adapter la recette</Button>
  </section>;
}
