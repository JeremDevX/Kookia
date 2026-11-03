import { useEffect, useRef } from "react";
import type { Recipe } from "../../types";
import Button from "../common/Button";

export default function RecipeDetail({ recipe, editing, onBack, onEdit, onProduce }: {
  recipe: Recipe & { maxYield: number };
  editing: boolean;
  onBack: () => void;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
  onProduce: (recipe: Recipe) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="recipe-detail" aria-labelledby="recipe-detail-title">
    <div className="recipe-detail-actions">
      <Button variant="outline" onClick={onBack}>Retour à mes recettes</Button>
      <div><Button variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier la recette</Button>
        {recipe.maxYield > 0 && <Button onClick={() => onProduce(recipe)}>Produire</Button>}</div>
    </div>
    <div className="recipe-detail-panel">
      <span>{recipe.category}</span><h2 id="recipe-detail-title" ref={heading} tabIndex={-1}>{recipe.name}</h2>
      <div className="recipe-detail-metrics"><p>Durée<strong>{recipe.prepTime} min</strong></p><p>Portions<strong>{recipe.yieldPortions} par lot</strong></p><p>Disponibilité<strong>{recipe.ingredients.length === 0 ? "Ingrédients à renseigner" : recipe.maxYield > 0 ? `Jusqu’à ${recipe.maxYield} portions sous réserve` : "Stock insuffisant ou à vérifier"}</strong></p></div>
    </div>
    <div className="recipe-detail-columns">
      <div className="recipe-detail-panel"><h3>Ingrédients</h3>
        {recipe.ingredients.length ? <ul>{recipe.ingredients.map((ingredient, index) => <li key={`${ingredient.productId}-${index}`}><span>{ingredient.productName}</span><strong>{ingredient.quantity} {ingredient.unit}</strong></li>)}</ul> : <p>Non renseignés</p>}
      </div>
      <div className="recipe-detail-panel"><h3>Préparation</h3>{recipe.steps?.length ? <ol>{recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p>Étapes non renseignées.</p>}</div>
    </div>
  </section>;
}
