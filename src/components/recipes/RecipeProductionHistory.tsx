import { useClientPresentation } from "../../features/members/workspaceContext";
import { AlertTriangle, ChefHat, Clock } from "lucide-react";
import Badge from "../common/Badge";
import Button from "../common/Button";
import Card from "../common/Card";
import { isScenarioProduction, productionNoteForDisplay } from "../../features/recipes/productionPresentation";
import { isValidISODate, shiftDays, startOfWeek } from "../../utils/date";
import type { Production } from "../../services/recipeService";
import type { Recipe } from "../../types";

const productionWeekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", timeZone: "UTC" });
const productionDate = (date: string) => date.slice(0, 10).split("-").reverse().join("/");
const formatIngredientCost = (cost: number | null) => cost === null ? "Indisponible" : `${cost.toFixed(2)} €`;

export default function RecipeProductionHistory({ recipes, productions, today, loading, recipeError, editing, costPerPortion,
  getProductName, getProductUnit, onEdit, onRefusal }: {
  recipes: Recipe[]; productions: Production[]; today: string; loading: boolean; recipeError: boolean; editing: boolean;
  costPerPortion: (recipe: Recipe) => number | null;
  getProductName: (id: string) => string; getProductUnit: (id: string) => string;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
  onRefusal: (recipe: Recipe) => void;
}) {
  const clientPresentation = useClientPresentation();
  const weekStart = startOfWeek(today);
  const nextWeekStart = shiftDays(weekStart, 7);
  const historyRecipes = recipes.filter(({ lastMade }) => {
    const day = lastMade?.slice(0, 10) ?? null;
    return isValidISODate(day) && day >= weekStart && day < nextWeekStart;
  });

  return <>
    {!clientPresentation && productions.some((item) => isScenarioProduction(item.operationId)) && <p className="workspace-subtitle" role="note">
      Le journal contient des enregistrements de QA isolés ; ils ne décrivent pas des productions observées du restaurant.
    </p>}
    {!recipeError && <div className="recipes-grid">
      {historyRecipes.length > 0 ? (
        historyRecipes.map((recipe) => (
          <Card key={recipe.id} className="recipe-card">
            <div className="recipe-header">
              <span className="recipe-title">{recipe.name}</span>
              <Badge label={recipe.category} status="neutral" />
            </div>
            <div className="recipe-meta">
              <span className="recipe-meta-item">
                <Clock size={14} /> {recipe.prepTime} min
              </span>
              <span className="recipe-meta-item">
                <ChefHat size={14} /> Cuisiné le{" "}
                {productionWeekday.format(new Date(recipe.lastMade!.slice(0, 10)))}
              </span>
            </div>
            <p>Version {recipe.version} · {recipe.effectiveFrom ? `effective depuis ${recipe.effectiveFrom}` : "date d’effet historique inconnue"} · rendement {recipe.yieldPortions} portions.</p>
            <div className="recipe-ingredients">
              <h4 className="text-secondary">Ingrédients du lot ({recipe.yieldPortions} portions)</h4>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="ingredient-item">
                  <span>{ing.productName || getProductName(ing.productId)}</span>
                  <span>{ing.quantity} {ing.unit || getProductUnit(ing.productId)}</span>
                </div>
              ))}
              <div className="cost-row">
                <div className="cost-col">
                  <span className="cost-label">Coût matière par portion</span>
                  <span className="cost-value">
                    {formatIngredientCost(costPerPortion(recipe))}
                  </span>
                </div>
              </div>
            </div>
            <div className="recipe-actions">
              <Button
                size="sm"
                variant="outline"
                icon={<AlertTriangle size={14} aria-hidden="true" />}
                onClick={() => onRefusal(recipe)}
              >
                Signaler un refus
              </Button>
              <Button size="sm" variant="outline" disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier la recette</Button>
            </div>
          </Card>
        ))
      ) : !loading && (
        <div className="empty-week">
          <p>Aucune recette du catalogue produite cette semaine.</p>
        </div>
      )}
    </div>}
    {productions.length > 0 && <section aria-label="Journal de production">
      <h2>Productions enregistrées</h2>
      {productions.map((item) => {
        const visibleNote = productionNoteForDisplay(item);
        const label = item.kind === "refusal" ? "Demandes refusées" : item.kind === "record" ? "Préparation notée — stock inchangé"
          : item.simulated ? (clientPresentation ? "Production à rapprocher" : "Production simulée") : "Production réalisée — stock déduit";
        return <Card key={item.id}>
          <strong>{item.recipeName}</strong>
          <p>{item.portions} portions · {productionDate(item.date)} · {label}{item.simulated && !clientPresentation ? " · Hors bilan" : ""}</p>
          {item.recipeVersion && <p>Version recette {item.recipeVersion.version} · rendement {item.recipeVersion.yieldPortions} portions · effet {item.recipeVersion.effectiveFrom ? productionDate(item.recipeVersion.effectiveFrom) : "date historique inconnue"}</p>}
          {visibleNote && <p>{visibleNote}</p>}
        </Card>;
      })}
    </section>}
  </>;
}
