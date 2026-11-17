import { CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../common/Badge";
import Button from "../common/Button";
import Card from "../common/Card";
import { recipeStockWarnings } from "../../features/recipes/productionAvailability";
import type { Product, Recipe } from "../../types";

type RecipeWithYield = Recipe & { maxYield: number };
const formatIngredientCost = (cost: number | null) => cost === null ? "Indisponible" : `${cost.toFixed(2)} €`;

export default function ProducibleRecipes({ recipes, products, producedRecipeIds, allRecipesHref, editing, costPerPortion,
  getProductName, getProductUnit, onEdit, onProduce, onRefusal }: {
  recipes: RecipeWithYield[]; products: Product[]; producedRecipeIds: Set<string>; allRecipesHref?: string; editing: boolean;
  costPerPortion: (recipe: Recipe) => number | null;
  getProductName: (id: string) => string; getProductUnit: (id: string) => string;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
  onProduce: (recipe: Recipe) => void;
  onRefusal: (recipe: Recipe) => void;
}) {
  const antiWasteRecipes = recipes.filter((recipe) => recipe.maxYield > 0);
  const unavailableRecipes = recipes.filter((recipe) => recipe.maxYield === 0 && recipe.ingredients.length > 0);
  const incompleteRecipes = recipes.filter((recipe) => recipe.ingredients.length === 0);

  return (
    <div className="recipes-grid">
      {antiWasteRecipes.map((recipe) => {
        const isProduced = producedRecipeIds.has(recipe.id);
        const warnings = recipeStockWarnings(recipe, products);
        return (
          <Card
            key={recipe.id}
            className={`recipe-card border-optimal ${
              isProduced ? "produced" : ""
            }`}
          >
            {isProduced && (
              <div className="produced-badge">
                <CheckCircle size={16} />
                <span>Préparée aujourd’hui</span>
              </div>
            )}
            <div className="recipe-header">
              <span className="recipe-title text-optimal">
                {recipe.name}
              </span>
              <Badge label={warnings.length ? "Faisable sous réserve" : "Faisable"} status="optimal" />
            </div>
            <div className="recipe-meta">
              <span className="recipe-meta-item">
                <Clock size={14} /> {recipe.prepTime} min
              </span>
              <span className="recipe-meta-item text-optimal font-medium">
                Stock suffisant pour une portion
              </span>
            </div>

            <div className="ingredients-box">
              <div className="stock-match-badge w-full justify-center mb-2">
                <CheckCircle size={16} />
                Jusqu’à {recipe.maxYield} portions avec les lots proposés
              </div>

              <div className="cost-row">
                <div className="cost-col">
                  <span className="cost-label">Coût matière par portion</span>
                  <span className="cost-value">
                    {formatIngredientCost(costPerPortion(recipe))}
                  </span>
                </div>
              </div>

              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="ingredient-row">
                  <span>{ing.productName || getProductName(ing.productId)}</span>
                  <span className="font-medium text-optimal">{ing.quantity} {ing.unit || getProductUnit(ing.productId)} / lot</span>
                </div>
              ))}
            </div>
            {warnings.length > 0 && <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
            <div className="recipe-actions">
              <Button
                size="sm"
                className="w-full"
                onClick={() => onProduce(recipe)}
              >
                {isProduced ? "Produire à nouveau" : "Produire cette recette"}
              </Button>
              <Button size="sm" variant="outline" className="w-full" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier la recette</Button>
            </div>
          </Card>
        );
      })}
      {allRecipesHref && recipes.length === 0 ? <div className="empty-week col-span-full"><p>Aucune recette du catalogue ne contient ce produit.</p><Link to={allRecipesHref}>Voir toutes les recettes</Link></div> : antiWasteRecipes.length === 0 && (
        <div className="empty-week col-span-full">
          <p>{recipes.length === 0 ? "Aucune recette disponible." : unavailableRecipes.length > 0 ? "Pas assez de stock pour préparer une portion des recettes renseignées." : "Aucune recette avec des ingrédients renseignés."}</p>
        </div>
      )}
      {unavailableRecipes.length > 0 && <section className="col-span-full" aria-label="Recettes non réalisables avec le stock actuel">
        <h3>Recettes non réalisables avec le stock actuel</h3>
        <p>Stock insuffisant pour une portion. Signalez les demandes refusées si besoin.</p>
        <div className="recipes-grid">{unavailableRecipes.map((recipe) => <Card key={recipe.id} className="recipe-card">
          <strong>{recipe.name}</strong>
          {recipeStockWarnings(recipe, products).length > 0 && <ul>{recipeStockWarnings(recipe, products).map(warning => <li key={warning}>{warning}</li>)}</ul>}
          <Button size="sm" variant="outline" onClick={() => onRefusal(recipe)}>Signaler un refus</Button>
          <Button size="sm" variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier la recette</Button>
        </Card>)}</div>
      </section>}
      {incompleteRecipes.length > 0 && <section className="col-span-full" aria-label="Recettes sans ingrédients renseignés">
        <p role="status">{incompleteRecipes.length} recette{incompleteRecipes.length > 1 ? "s" : ""} sans ingrédients renseignés ne peuvent pas être produites.</p>
        {incompleteRecipes.map((recipe) => <Card key={recipe.id} className="recipe-card"><strong>{recipe.name}</strong>
          <Button size="sm" variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Compléter la recette</Button>
        </Card>)}
      </section>}
    </div>
  );
}
