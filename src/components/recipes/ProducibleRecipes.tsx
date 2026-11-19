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
                <CheckCircle size={16} aria-hidden="true" />
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
            </div>

            <div className="ingredients-box">
              <div className="stock-match-badge w-full justify-center">
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
                  <span className="text-optimal">{ing.quantity} {ing.unit || getProductUnit(ing.productId)} / lot</span>
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
      {recipes.length === 0 && (
        <div className="empty-week">
          <p>{allRecipesHref ? "Aucune recette du catalogue ne contient ce produit." : "Aucune recette disponible."}</p>
          {allRecipesHref && <Link to={allRecipesHref}>Voir toutes les recettes</Link>}
        </div>
      )}
      {unavailableRecipes.length > 0 && <section className="recipe-availability-group flex-col gap-sm" aria-label="Recettes non réalisables avec le stock actuel">
        <h3>Recettes non réalisables avec le stock actuel</h3>
        <div className="recipes-grid">{unavailableRecipes.map((recipe) => {
          const warnings = recipeStockWarnings(recipe, products);
          return <Card key={recipe.id} className="recipe-card">
            <strong>{recipe.name}</strong>
            {warnings.length > 0 && <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
            <div className="recipe-actions">
              <Button size="sm" variant="outline" onClick={() => onRefusal(recipe)}>Signaler un refus</Button>
              <Button size="sm" variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier la recette</Button>
            </div>
          </Card>;
        })}</div>
      </section>}
      {incompleteRecipes.length > 0 && <section className="recipe-availability-group flex-col gap-sm" aria-label="Recettes sans ingrédients renseignés">
        <h3>Recettes à compléter</h3>
        <p>Renseignez les ingrédients pour vérifier le stock disponible.</p>
        <div className="recipes-grid">
          {incompleteRecipes.map((recipe) => <Card key={recipe.id} className="recipe-card"><strong>{recipe.name}</strong>
            <div className="recipe-actions">
              <Button size="sm" variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Compléter la recette</Button>
            </div>
          </Card>)}
        </div>
      </section>}
    </div>
  );
}
