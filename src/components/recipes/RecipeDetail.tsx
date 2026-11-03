import { useEffect, useRef, useState } from "react";
import type { Recipe } from "../../types";
import Button from "../common/Button";
import { productionIngredientAmount } from "../../domain/recipes/productionIngredientAmount";

export default function RecipeDetail({ recipe, editing, onBack, onEdit, onProduce }: {
  recipe: Recipe & { maxYield: number };
  editing: boolean;
  onBack: () => void;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
  onProduce: (recipe: Recipe, portions: number) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [portions, setPortions] = useState(String(recipe.yieldPortions));
  const count = Number(portions);
  const validPortions = Number.isInteger(count) && count >= 1 && count <= 10000;
  const producible = validPortions && recipe.ingredients.every((ingredient) =>
    productionIngredientAmount(ingredient.quantity, count, recipe.yieldPortions, ingredient.unit) !== null);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="recipe-detail" aria-labelledby="recipe-detail-title">
    <div className="recipe-detail-actions">
      <Button variant="outline" onClick={onBack}>Retour à mes recettes</Button>
      <div><Button variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier la recette</Button>
        {recipe.maxYield > 0 && <Button disabled={!producible} onClick={() => onProduce(recipe, count)}>Produire</Button>}</div>
    </div>
    <div className="recipe-detail-panel">
      <span>{recipe.category}</span><h2 id="recipe-detail-title" ref={heading} tabIndex={-1}>{recipe.name}</h2>
      <div className="recipe-detail-metrics"><p>Durée<strong>{recipe.prepTime} min</strong></p><p>Portions<strong>{recipe.yieldPortions} par lot</strong></p><p>Disponibilité<strong>{recipe.ingredients.length === 0 ? "Ingrédients à renseigner" : recipe.maxYield > 0 ? `Jusqu’à ${recipe.maxYield} portions sous réserve` : "Stock insuffisant ou à vérifier"}</strong></p></div>
    </div>
    <div className="recipe-detail-columns">
      <div className="recipe-detail-panel"><h3>Ingrédients</h3>
        <label>Portions souhaitées <input type="number" min="1" max="10000" step="1" value={portions}
          onChange={(event) => setPortions(event.target.value)} aria-invalid={!validPortions} aria-describedby="recipe-portions-help" /></label>
        <p id="recipe-portions-help">{validPortions ? producible ? "Quantités arrondies à 0,001 unité ; la production se confirme séparément." : "Production impossible pour ces portions : ajustez leur nombre." : "Indiquez un nombre entier de 1 à 10 000."}</p>
        {recipe.ingredients.length ? <ul>{recipe.ingredients.map((ingredient, index) => {
          const amount = validPortions ? productionIngredientAmount(ingredient.quantity, count, recipe.yieldPortions, ingredient.unit) : null;
          return <li key={`${ingredient.productId}-${index}`}><span>{ingredient.productName}</span><strong>{amount === null ? "Impossible à produire" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(amount)} ${ingredient.unit}`}</strong></li>;
        })}</ul> : <p>Non renseignés</p>}
      </div>
      <div className="recipe-detail-panel"><h3>Préparation</h3>{recipe.steps?.length ? <ol>{recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p>Étapes non renseignées.</p>}</div>
    </div>
  </section>;
}
