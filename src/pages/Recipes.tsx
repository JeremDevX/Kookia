import React, { useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import RecordProductionModal from "../components/recipes/RecordProductionModal";
import ProductionConfirmModal from "../components/recipes/ProductionConfirmModal";
import { Clock, ChefHat, CheckCircle, Leaf, AlertTriangle } from "lucide-react";
import { MOCK_RECIPES, type Recipe } from "../utils/mockData";
import { format, parseISO, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "../context/ToastContext";
import type { ProductionRecord } from "../types/callbacks";
import {
  getProductNameForRecipe as getProductName,
  getProductUnitForRecipe as getProductUnit,
  calculateMaxYield,
  calculateIngredientCost,
} from "../services/recipeService";
import "./Recipes.css";

const Recipes: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"history" | "anti-waste">(
    "history"
  );
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMaxYield, setSelectedMaxYield] = useState(0);
  const [producedRecipes, setProducedRecipes] = useState<string[]>([]);

  const handleRecordProduction = (data: ProductionRecord) => {
    addToast(
      "success",
      "Production enregistrée",
      `${data.portions} portions de ${data.recipeName} ont été enregistrées.`
    );
  };

  const handleStartProduction = (recipe: Recipe, maxYield: number) => {
    setSelectedRecipe(recipe);
    setSelectedMaxYield(maxYield);
    setIsProductionModalOpen(true);
  };

  const handleConfirmProduction = (quantity: number) => {
    if (selectedRecipe) {
      setProducedRecipes((prev) => [...prev, selectedRecipe.id]);
      addToast(
        "success",
        "Production lancée",
        `${quantity} portions de ${selectedRecipe.name} en cours. Ingrédients déduits du stock.`
      );
    }
  };

  // 1. Filter: Recipes made this week
  const historyRecipes = MOCK_RECIPES.filter(
    (r) =>
      r.lastMade &&
      isSameWeek(parseISO(r.lastMade), new Date(), { weekStartsOn: 1 })
  );

  // 2. Logic: Calculate feasible quantity based on stock (using service)
  const antiWasteRecipes = MOCK_RECIPES.map((recipe) => ({
    ...recipe,
    maxYield: calculateMaxYield(recipe),
  }))
    .filter((r) => r.maxYield > 0) // Only show possible recipes
    .sort((a, b) => b.maxYield - a.maxYield); // Sort by quantity possible

  return (
    <div className="recipes-container">
      <header className="page-header glass-header">
        <div>
          <h1 className="page-title">Carnet de Recettes</h1>
          <p className="page-subtitle">
            Gérez votre production et réduisez le gaspillage
          </p>
        </div>
        <div className="flex gap-sm">
          <Button
            variant={activeTab === "history" ? "primary" : "outline"}
            onClick={() => setActiveTab("history")}
            size="sm"
          >
            Semaine en cours
          </Button>
          <Button
            variant={activeTab === "anti-waste" ? "primary" : "outline"}
            onClick={() => setActiveTab("anti-waste")}
            size="sm"
            icon={<Leaf size={16} />}
          >
            Suggestions Anti-Gaspi
          </Button>
        </div>
      </header>

      {/* TAB 1: HISTORY */}
      {activeTab === "history" && (
        <div className="recipes-grid">
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
                    {format(parseISO(recipe.lastMade!), "EEEE d", {
                      locale: fr,
                    })}
                  </span>
                </div>
                <div className="recipe-ingredients">
                  <h4 className="text-xs font-semibold uppercase text-secondary mb-2">
                    Ingrédients utilisés
                  </h4>
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="ingredient-item">
                      <span>{getProductName(ing.productId)}</span>
                      <span>
                        {ing.quantity} {getProductUnit(ing.productId)}
                      </span>
                    </div>
                  ))}
                  {/* Economics Section */}
                  <div className="cost-row mt-3">
                    <div className="cost-col">
                      <span className="cost-label">Coût Matière</span>
                      <span className="cost-value">
                        {calculateIngredientCost(recipe.ingredients).toFixed(2)}
                        €
                      </span>
                    </div>
                    <div className="cost-col items-end">
                      <span className="cost-label">Marge Est. (75%)</span>
                      <span className="cost-value margin">
                        +
                        {(
                          calculateIngredientCost(recipe.ingredients) * 3
                        ).toFixed(2)}
                        €
                      </span>
                    </div>
                  </div>
                </div>
                <div className="recipe-actions mt-auto pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="btn-danger-outline w-full"
                    icon={<AlertTriangle size={14} />}
                    onClick={() => {
                      const qty = window.prompt(
                        `Combien de "${recipe.name}" refusés par manque de stock ?`
                      );
                      if (qty && parseInt(qty) > 0) {
                        addToast(
                          "success",
                          "Demande enregistrée",
                          `L'IA ajustera les prévisions pour ${recipe.name} (+${qty} demandes).`
                        );
                      }
                    }}
                  >
                    Signaler Refus
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="empty-week col-span-full">
              <ChefHat
                size={48}
                className="mx-auto mb-4 text-secondary opacity-50"
              />
              <p>Aucune recette enregistrée cette semaine.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsRecordModalOpen(true)}
              >
                Enregistrer une production
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANTI-WASTE SUGGESTIONS */}
      {activeTab === "anti-waste" && (
        <div className="recipes-grid">
          {antiWasteRecipes.map((recipe) => {
            const isProduced = producedRecipes.includes(recipe.id);
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
                    <span>Produit</span>
                  </div>
                )}
                {/* Special styling for recommended items */}
                <div className="recipe-header">
                  <span className="recipe-title text-optimal">
                    {recipe.name}
                  </span>
                  <Badge label="Faisable" status="optimal" />
                </div>
                <div className="recipe-meta">
                  <span className="recipe-meta-item">
                    <Clock size={14} /> {recipe.prepTime} min
                  </span>
                  <span className="recipe-meta-item text-optimal font-medium">
                    100% Stock dispo
                  </span>
                </div>

                <div className="ingredients-box">
                  <div className="stock-match-badge w-full justify-center mb-2">
                    <CheckCircle size={16} />
                    Vous pouvez faire {recipe.maxYield} portions
                  </div>

                  {/* Economics Section */}
                  <div className="cost-row">
                    <div className="cost-col">
                      <span className="cost-label">Coût Matière</span>
                      <span className="cost-value">
                        {calculateIngredientCost(recipe.ingredients).toFixed(2)}
                        €
                      </span>
                    </div>
                    <div className="cost-col items-end">
                      <span className="cost-label">Marge Est. (75%)</span>
                      <span className="cost-value margin">
                        +
                        {(
                          calculateIngredientCost(recipe.ingredients) * 3
                        ).toFixed(2)}
                        €
                      </span>
                    </div>
                  </div>

                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="ingredient-row">
                      <span>{getProductName(ing.productId)}</span>
                      <span className="font-medium text-optimal">Stock OK</span>
                    </div>
                  ))}
                </div>
                <div className="recipe-actions">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleStartProduction(recipe, recipe.maxYield)
                    }
                    disabled={isProduced}
                  >
                    {isProduced ? "Produit ✓" : "Lancer Production"}
                  </Button>
                </div>
              </Card>
            );
          })}
          {antiWasteRecipes.length === 0 && (
            <div className="empty-week col-span-full">
              <p>Pas assez de stock pour des recettes complètes sans achat.</p>
            </div>
          )}
        </div>
      )}

      <RecordProductionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecord={handleRecordProduction}
      />

      <ProductionConfirmModal
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        recipe={selectedRecipe}
        maxYield={selectedMaxYield}
        onConfirm={handleConfirmProduction}
      />
    </div>
  );
};

export default Recipes;
