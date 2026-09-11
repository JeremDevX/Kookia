import React, { useState, useEffect } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import RecordProductionModal from "../components/recipes/RecordProductionModal";
import ProductionConfirmModal from "../components/recipes/ProductionConfirmModal";
import { Clock, ChefHat, CheckCircle, Leaf, AlertTriangle } from "lucide-react";
import { format, parseISO, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "../context/ToastContext";
import { useRecipes } from "../hooks";
import type { Recipe } from "../types";
import { getProductions, recordProduction, type Production } from "../services/recipeService";
import { formatLocalISODate } from "../utils/date";
import type { ProductionRecord } from "../types/callbacks";
import "./Recipes.css";
import "../styles/Workspace.css";

const Recipes: React.FC = () => {
  const { addToast } = useToast();
  const {
    recipes, loading, error, refetch,
    getMaxYield,
    getIngredientCost,
    getProductName,
    getProductUnit,
  } = useRecipes();
  const [activeTab, setActiveTab] = useState<"history" | "anti-waste">(
    "history"
  );
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMaxYield, setSelectedMaxYield] = useState(0);
  const [productions, setProductions] = useState<Production[]>([]);
  const [productionError, setProductionError] = useState("");
  useEffect(() => {
    let active = true;
    getProductions().then((data) => { if (active) setProductions(data); }, () => { if (active) setProductionError("Historique de production indisponible."); });
    return () => { active = false; };
  }, []);
  const producedRecipes = productions.filter((item) => item.kind === "production" && item.date.slice(0, 10) === formatLocalISODate(new Date())).map((item) => item.recipeId);


  const handleRecordProduction = async (data: ProductionRecord, operationId: string) => {
    const saved = await recordProduction({ operationId, recipeName: data.recipeName,
      portions: Number(data.portions), prepTime: Number(data.prepTime || 0), notes: data.notes,
      date: formatLocalISODate(new Date(data.date)), kind: "record" });
    setProductions((prev) => [saved, ...prev]);
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

  const handleConfirmProduction = async (quantity: number, operationId: string) => {
    if (selectedRecipe) {
      const saved = await recordProduction({ operationId, recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name, portions: quantity, prepTime: selectedRecipe.prepTime,
        notes: "", date: formatLocalISODate(new Date()), kind: "production" });
      setProductions((prev) => [saved, ...prev]);
      await refetch();
      addToast(
        "success",
        "Production lancée",
        `${quantity} portions de ${selectedRecipe.name} en cours. Ingrédients déduits du stock.`
      );
    }
  };

  // 1. Filter: Recipes made this week
  const historyRecipes = recipes.filter(
    (r) =>
      r.lastMade &&
      isSameWeek(parseISO(r.lastMade), new Date(), { weekStartsOn: 1 })
  );

  // 2. Logic: Calculate feasible quantity based on stock (using service)
  const antiWasteRecipes = recipes.map((recipe) => ({
    ...recipe,
    maxYield: getMaxYield(recipe),
  }))
    .filter((r) => r.maxYield > 0) // Only show possible recipes
    .sort((a, b) => b.maxYield - a.maxYield); // Sort by quantity possible

  return (
    <div className="recipes-container workspace-page">
      {loading && <p role="status">Chargement des recettes…</p>}
      {error && <p role="alert">{error.message}</p>}
      {productionError && <p role="alert">{productionError}</p>}
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">LE SAVOIR-FAIRE AU QUOTIDIEN</p>
          <h1>De bons produits. De belles idées.</h1>
          <p className="workspace-subtitle">
            Retrouvez vos recettes et donnez le meilleur de vos stocks.
          </p>
        </div>
        <Button icon={<ChefHat size={17} />} onClick={() => setIsRecordModalOpen(true)}>Enregistrer une production</Button>
      </header>

      <div className="workspace-summary"><div><span>Votre carnet de cuisine</span><strong>{recipes.length} recettes</strong></div><p>Inspirez-vous des produits disponibles. Ajustez les portions, puis confirmez votre production.</p></div>
      <div className="workspace-section-heading"><h2>À cuisiner, à partager</h2>
        <div className="view-toggles">
          <Button
            aria-pressed={activeTab === "history"}
            variant={activeTab === "history" ? "primary" : "outline"}
            onClick={() => setActiveTab("history")}
            size="sm"
          >
            Semaine en cours
          </Button>
          <Button
            aria-pressed={activeTab === "anti-waste"}
            variant={activeTab === "anti-waste" ? "primary" : "outline"}
            onClick={() => setActiveTab("anti-waste")}
            size="sm"
            icon={<Leaf size={16} />}
          >
            Avec mes stocks
          </Button>
        </div>
      </div>

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
                        {getIngredientCost(recipe.ingredients).toFixed(2)}
                        €
                      </span>
                    </div>
                    <div className="cost-col items-end">
                      <span className="cost-label">Marge Est. (75%)</span>
                      <span className="cost-value margin">
                        +
                        {(getIngredientCost(recipe.ingredients) * 3).toFixed(2)}
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
                    onClick={async () => {
                      const qty = window.prompt(
                        `Combien de "${recipe.name}" refusés par manque de stock ?`
                      );
                      if (qty && Number.isInteger(Number(qty)) && Number(qty) > 0) {
                        try {
                          const saved = await recordProduction({ operationId: crypto.randomUUID(), recipeId: recipe.id,
                            recipeName: recipe.name, portions: Number(qty), prepTime: 0, notes: "",
                            date: formatLocalISODate(new Date()), kind: "refusal" });
                          setProductions((prev) => [saved, ...prev]);
                          addToast("success", "Demande enregistrée", `${qty} demandes refusées enregistrées pour ${recipe.name}.`);
                        } catch (error) { addToast("info", "Enregistrement impossible", error instanceof Error ? error.message : "Réessayez."); }
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
                        {getIngredientCost(recipe.ingredients).toFixed(2)}
                        €
                      </span>
                    </div>
                    <div className="cost-col items-end">
                      <span className="cost-label">Marge Est. (75%)</span>
                      <span className="cost-value margin">
                        +
                        {(getIngredientCost(recipe.ingredients) * 3).toFixed(2)}
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

      {activeTab === "history" && productions.length > 0 && <section aria-label="Journal de production">
        <h2>Journal de production</h2>
        {productions.map((item) => <Card key={item.id}><strong>{item.recipeName}</strong><p>{item.portions} portions · {new Date(item.date).toLocaleDateString("fr-FR")} · {item.kind === "refusal" ? "Demandes refusées" : item.kind === "record" ? "Production déclarée — sans déduction de stock" : "Production réalisée — stock déduit"}</p>{item.notes && <p>{item.notes}</p>}</Card>)}
      </section>}

      <RecordProductionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecord={handleRecordProduction}
      />

      <ProductionConfirmModal
        key={`${selectedRecipe?.id ?? "none"}-${selectedMaxYield}-${isProductionModalOpen ? "open" : "closed"}`}
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        recipe={selectedRecipe}
        maxYield={selectedMaxYield}
        costPerPortion={selectedRecipe ? getIngredientCost(selectedRecipe.ingredients) : 0}
        onConfirm={handleConfirmProduction}
      />
    </div>
  );
};

export default Recipes;
