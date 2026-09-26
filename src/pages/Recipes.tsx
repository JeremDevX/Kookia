import React, { useState, useEffect, useCallback, useMemo } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import RecordProductionModal from "../components/recipes/RecordProductionModal";
import ProductionConfirmModal from "../components/recipes/ProductionConfirmModal";
import ReportRefusalModal from "../components/recipes/ReportRefusalModal";
import RecipeEditor from "../components/recipes/RecipeEditor";
import RecipeCandidates from "../components/recipes/RecipeCandidates";
import RecipeSuggestionPanel from "../components/recipes/RecipeSuggestionPanel";
import { Clock, ChefHat, CheckCircle, Leaf, AlertTriangle } from "lucide-react";
import { format, parseISO, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "../context/ToastContext";
import { useRecipes } from "../hooks";
import type { Recipe } from "../types";
import { suggestRecipeFromIncomingProduct, type RecipeSuggestion } from "../domain/recipes/recipeSuggestionPolicy";
import { getProductions, recordProduction, type Production } from "../services/recipeService";
import { getPurchaseReceiptLineEvidence, type PurchaseReceiptLineEvidence } from "../services/orderService";
import { formatLocalISODate } from "../utils/date";
import type { ProductionRecord } from "../types/callbacks";
import { ApiError } from "../config/api";
import { Link, useSearchParams } from "react-router-dom";
import "./Recipes.css";
import "../styles/Workspace.css";

const Recipes: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get("product");
  const incomingReceiptLineId = searchParams.get("incomingReceiptLineId");
  const { addToast } = useToast();
  const {
    recipes, products, loading, error, refetch,
    getMaxYield,
    getIngredientCost,
    getProductName,
    getProductUnit,
  } = useRecipes();
  const [activeTab, setActiveTab] = useState<"history" | "anti-waste">("anti-waste");
  const displayedTab = productId ? "anti-waste" : activeTab;
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [refusalRecipe, setRefusalRecipe] = useState<Recipe | null>(null);
  const [productions, setProductions] = useState<Production[]>([]);
  const [productionError, setProductionError] = useState("");
  const [incomingReceiptResult, setIncomingReceiptResult] = useState<{
    receiptLineId: string;
    evidence?: PurchaseReceiptLineEvidence;
    error?: string;
  } | null>(null);
  const [incomingReceiptRetryRevision, setIncomingReceiptRetryRevision] = useState(0);
  const [recipeEditorOpen, setRecipeEditorOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipePrefill, setRecipePrefill] = useState<RecipeSuggestion | null>(null);
  const recipeEditorHeading = React.useRef<HTMLHeadingElement>(null);
  const pageHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const incomingReceiptRetryButtonRef = React.useRef<HTMLButtonElement>(null);
  const incomingReceiptRetryFocusPending = React.useRef(false);
  const recipeEditOrigin = React.useRef<HTMLButtonElement | null>(null);
  const today = formatLocalISODate(new Date());
  useEffect(() => {
    if (!incomingReceiptLineId) return;
    let active = true;
    getPurchaseReceiptLineEvidence(incomingReceiptLineId).then((evidence) => {
      if (active) setIncomingReceiptResult({ receiptLineId: incomingReceiptLineId, evidence });
    }, (cause: unknown) => {
      if (active) setIncomingReceiptResult({ receiptLineId: incomingReceiptLineId,
        error: cause instanceof Error ? cause.message : "Réessayez." });
    });
    return () => { active = false; };
  }, [incomingReceiptLineId, incomingReceiptRetryRevision]);
  const incomingReceipt = incomingReceiptResult?.receiptLineId === incomingReceiptLineId
    ? incomingReceiptResult.evidence ?? null : null;
  const incomingReceiptError = incomingReceiptResult?.receiptLineId === incomingReceiptLineId
    ? incomingReceiptResult.error ?? "" : "";
  const incomingReceiptLoading = Boolean(incomingReceiptLineId) && !incomingReceipt && !incomingReceiptError;
  useEffect(() => {
    if (incomingReceiptLoading || !incomingReceiptRetryFocusPending.current) return;
    incomingReceiptRetryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (incomingReceiptError) incomingReceiptRetryButtonRef.current?.focus();
    else pageHeadingRef.current?.focus();
  }, [incomingReceiptError, incomingReceiptLoading]);
  const retryIncomingReceipt = () => {
    incomingReceiptRetryFocusPending.current = document.activeElement === incomingReceiptRetryButtonRef.current;
    setIncomingReceiptResult(null);
    setIncomingReceiptRetryRevision((revision) => revision + 1);
  };
  const incomingSuggestion = useMemo(() => {
    const product = incomingReceipt ? products.find((item) => item.id === incomingReceipt.productId) : undefined;
    const sourceReceipt = incomingReceipt ? { receiptLineId: incomingReceipt.receiptLineId,
      reference: incomingReceipt.deliveryReference, receivedQuantity: incomingReceipt.receivedQuantity, unit: incomingReceipt.unit } : undefined;
    return product && incomingReceipt ? suggestRecipeFromIncomingProduct(product, products,
      incomingReceipt.deliveryDate, sourceReceipt) : null;
  }, [incomingReceipt, products]);
  const refreshProductions = useCallback(async () => {
    try { setProductions(await getProductions()); setProductionError(""); }
    catch { setProductionError("Historique de production indisponible."); }
  }, []);
  useEffect(() => {
    let active = true;
    getProductions().then((data) => { if (active) { setProductions(data); setProductionError(""); } },
      () => { if (active) setProductionError("Historique de production indisponible."); });
    return () => { active = false; };
  }, []);
  const producedRecipes = productions.filter((item) => item.kind === "production" && item.date.slice(0, 10) === today).map((item) => item.recipeId);
  const simulatedProductionThisWeek = productions.some((item) => item.kind === "production" &&
    item.operationId.startsWith("restaurant-simulation-v1:") &&
    isSameWeek(parseISO(item.date.slice(0, 10)), parseISO(today), { weekStartsOn: 1 }));
  const formatIngredientCost = (recipe: Recipe) => {
    const cost = getIngredientCost(recipe);
    return cost === null ? "Indisponible" : `${cost.toFixed(2)} €`;
  };

  const openRecipeEditor = (recipe: Recipe | null, trigger: HTMLButtonElement, suggestion: RecipeSuggestion | null = null) => {
    recipeEditOrigin.current = trigger;
    setEditingRecipe(recipe); setRecipePrefill(suggestion); setRecipeEditorOpen(true);
    requestAnimationFrame(() => document.getElementById("recipe-editor-section-title")?.scrollIntoView({ block: "nearest" }));
  };
  const closeRecipeEditor = () => {
    setRecipeEditorOpen(false); setEditingRecipe(null); setRecipePrefill(null);
    requestAnimationFrame(() => { if (recipeEditOrigin.current?.isConnected) recipeEditOrigin.current.focus(); });
  };
  const handleRecipeSaved = async () => {
    await refetch();
    if (!recipePrefill) return;
    setRecipePrefill(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("incomingReceiptLineId");
      return next;
    });
  };


  const handleRecordProduction = async (data: ProductionRecord, operationId: string) => {
    const saved = await recordProduction({ operationId, recipeName: data.recipeName,
      portions: Number(data.portions), prepTime: Number(data.prepTime || 0), notes: data.notes,
      date: formatLocalISODate(new Date(data.date)), kind: "record" });
    setProductions((prev) => [saved, ...prev]);
    void refreshProductions();
    addToast(
      "success",
      "Préparation ajoutée au journal",
      `${data.portions} portions de ${data.recipeName} notées. Stock inchangé.`
    );
  };

  const handleStartProduction = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsProductionModalOpen(true);
  };

  const handleConfirmProduction = async (quantity: number, operationId: string) => {
    if (selectedRecipe) {
      try {
        const saved = await recordProduction({ operationId, recipeId: selectedRecipe.id,
          expectedRecipeRevision: selectedRecipe.version,
          recipeName: selectedRecipe.name, portions: quantity, prepTime: selectedRecipe.prepTime,
          notes: "", date: formatLocalISODate(new Date()), kind: "production" });
        setProductions((prev) => [saved, ...prev]);
        void refreshProductions();
        await refetch();
        addToast("success", "Production enregistrée", `${quantity} portions de ${selectedRecipe.name} enregistrées. Ingrédients déduits du stock.`);
      } catch (cause) {
        if (cause instanceof ApiError && cause.details.code === "INSUFFICIENT_STOCK") await refetch();
        throw cause;
      }
    }
  };

  // 1. Filter: Recipes made this week
  const historyRecipes = recipes.filter(
    (r) =>
      r.lastMade &&
      isSameWeek(parseISO(r.lastMade.slice(0, 10)), parseISO(formatLocalISODate(new Date())), { weekStartsOn: 1 })
  );

  // 2. Logic: Calculate feasible quantity based on stock (using service)
  const recipesWithYield = (loading || error ? [] : recipes).map((recipe) => ({
    ...recipe,
    maxYield: getMaxYield(recipe),
  }));
  const matchingRecipes = productId ? recipesWithYield.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.productId === productId)) : recipesWithYield;
  const antiWasteRecipes = matchingRecipes.filter((recipe) => recipe.maxYield > 0);
  const unavailableRecipes = matchingRecipes.filter((recipe) => recipe.maxYield === 0 && recipe.ingredients.length > 0);
  const incompleteRecipes = matchingRecipes.filter((recipe) => recipe.ingredients.length === 0);

  const handleReportRefusal = async (recipe: Recipe, portions: number, operationId: string) => {
    const saved = await recordProduction({ operationId, recipeId: recipe.id,
      expectedRecipeRevision: recipe.version,
      recipeName: recipe.name, portions, prepTime: 0, notes: "",
      date: formatLocalISODate(new Date()), kind: "refusal" });
    setProductions((prev) => [saved, ...prev]);
    void refreshProductions();
    addToast("success", "Demandes refusées enregistrées", `${portions} demande${portions > 1 ? "s" : ""} pour ${recipe.name}.`);
  };

  return (
    <div className="recipes-container workspace-page">
      {loading && <p role="status">Chargement des recettes…</p>}
      {error && <div role="alert"><p>{error.message}</p><Button onClick={() => void refetch()}>Réessayer</Button></div>}
      {productionError && <div role="alert"><p>{productionError}</p><Button onClick={() => void refreshProductions()}>Réessayer</Button></div>}
      <header className="workspace-header">
        <div>
          <h1 ref={pageHeadingRef} tabIndex={-1}>{productId ? `Recettes avec ${loading ? "ce produit" : getProductName(productId)}` : "Recettes réalisables"}</h1>
          <p className="workspace-subtitle">{productId ? "Recettes contenant cet ingrédient, réalisables ou non selon l'inventaire enregistré. Aucun surstock n'est déduit automatiquement." : "Faisabilité selon les quantités et recettes enregistrées. La validation d'une production déduit les ingrédients du stock."}</p>
        </div>
        {!productId && <Button icon={<ChefHat size={17} />} onClick={() => setIsRecordModalOpen(true)}>Noter une préparation hors catalogue</Button>}
      </header>

      {incomingReceiptLineId && incomingReceiptLoading && <p role="status">Chargement de la réception source…</p>}
      {incomingReceiptLineId && incomingReceiptError && <div role="alert"><p>La réception source est indisponible : {incomingReceiptError}</p>
        <Button ref={incomingReceiptRetryButtonRef} type="button" variant="outline" onClick={retryIncomingReceipt}>Réessayer</Button>
      </div>}
      {incomingReceiptLineId && !loading && !error && !incomingReceiptLoading && !incomingReceiptError && incomingSuggestion && <RecipeSuggestionPanel suggestion={incomingSuggestion}
        onReview={(trigger) => openRecipeEditor(null, trigger, incomingSuggestion)} />}
      {incomingReceiptLineId && !loading && !error && !incomingReceiptLoading && !incomingReceiptError && !incomingSuggestion && <p role="status">
        Aucune proposition de recette automatique n’est disponible pour cette réception. Vous pouvez créer une recette depuis le catalogue.
      </p>}
      <RecipeEditor open={recipeEditorOpen} recipe={editingRecipe} products={products} headingRef={recipeEditorHeading}
        initialSuggestion={recipePrefill} onCreate={(trigger) => openRecipeEditor(null, trigger)}
        onClose={closeRecipeEditor} onSaved={handleRecipeSaved} />
      {!productId && !incomingReceiptLineId && <RecipeCandidates products={products} onRecipeConfirmed={refetch} />}

      {!productId && <div className="workspace-summary"><div><span>Catalogue</span><strong>{recipes.length} recettes</strong></div></div>}
      {productId && !loading && !error && <p className="recipes-context" role="status">{matchingRecipes.length} recette{matchingRecipes.length > 1 ? "s" : ""} trouvée{matchingRecipes.length > 1 ? "s" : ""}. <Link to="/recipes" onClick={() => setActiveTab("anti-waste")}>Voir toutes les recettes</Link></p>}
      <div className="workspace-section-heading"><h2>Recettes</h2>
        <div className="view-toggles">
          <Button
            aria-pressed={displayedTab === "history"}
            variant={displayedTab === "history" ? "primary" : "outline"}
            onClick={() => { if (productId) setSearchParams({}); setActiveTab("history"); }}
            size="sm"
          >
            Produites cette semaine
          </Button>
          <Button
            aria-pressed={displayedTab === "anti-waste"}
            variant={displayedTab === "anti-waste" ? "primary" : "outline"}
            onClick={() => setActiveTab("anti-waste")}
            size="sm"
            icon={<Leaf size={16} />}
          >
            Réalisables avec le stock
          </Button>
        </div>
      </div>

      {displayedTab === "history" && simulatedProductionThisWeek && <p className="workspace-subtitle" role="note">
        Cette semaine comprend des productions simulées pour la démonstration ; elles ne sont pas des productions observées.
      </p>}

      {/* TAB 1: HISTORY */}
      {displayedTab === "history" && (
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
                    {format(parseISO(recipe.lastMade!.slice(0, 10)), "EEEE d", {
                      locale: fr,
                    })}
                  </span>
                </div>
                <p>Version {recipe.version} · {recipe.effectiveFrom ? `effective depuis ${recipe.effectiveFrom}` : "date d’effet historique inconnue"} · rendement {recipe.yieldPortions} portions.</p>
                <div className="recipe-ingredients">
                  <h4 className="text-xs font-semibold uppercase text-secondary mb-2">Ingrédients du lot ({recipe.yieldPortions} portions)</h4>
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="ingredient-item">
                      <span>{ing.productName || getProductName(ing.productId)}</span>
                      <span>{ing.quantity} {ing.unit || getProductUnit(ing.productId)}</span>
                    </div>
                  ))}
                  {/* Economics Section */}
                  <div className="cost-row mt-3">
                    <div className="cost-col">
                      <span className="cost-label">Coût matière par portion</span>
                      <span className="cost-value">
                        {formatIngredientCost(recipe)}
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
                    onClick={() => setRefusalRecipe(recipe)}
                  >
                    Signaler un refus
                  </Button>
                  <Button size="sm" variant="outline" onClick={(event) => openRecipeEditor(recipe, event.currentTarget)}>Modifier la recette</Button>
                </div>
              </Card>
            ))
          ) : !loading && !error && (
            <div className="empty-week col-span-full">
              <ChefHat
                size={48}
                className="mx-auto mb-4 text-secondary opacity-50"
              />
              <p>Aucune recette du catalogue produite cette semaine.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANTI-WASTE SUGGESTIONS */}
      {displayedTab === "anti-waste" && (
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
                    <span>Préparée aujourd’hui</span>
                  </div>
                )}
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
                    Stock suffisant pour une portion
                  </span>
                </div>

                <div className="ingredients-box">
                  <div className="stock-match-badge w-full justify-center mb-2">
                    <CheckCircle size={16} />
                    Jusqu’à {recipe.maxYield} portions avec le stock actuel
                  </div>

                  {/* Economics Section */}
                  <div className="cost-row">
                    <div className="cost-col">
                      <span className="cost-label">Coût matière par portion</span>
                      <span className="cost-value">
                        {formatIngredientCost(recipe)}
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
                <div className="recipe-actions">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleStartProduction(recipe)
                    }
                  >
                    {isProduced ? "Produire à nouveau" : "Produire cette recette"}
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={(event) => openRecipeEditor(recipe, event.currentTarget)}>Modifier la recette</Button>
                </div>
              </Card>
            );
          })}
          {productId && matchingRecipes.length === 0 && !loading && !error ? <div className="empty-week col-span-full"><p>Aucune recette du catalogue ne contient ce produit.</p><Link to="/recipes" onClick={() => setActiveTab("anti-waste")}>Voir toutes les recettes</Link></div> : antiWasteRecipes.length === 0 && !loading && !error && (
            <div className="empty-week col-span-full">
              <p>{recipes.length === 0 ? "Aucune recette disponible." : unavailableRecipes.length > 0 ? "Pas assez de stock pour préparer une portion des recettes renseignées." : "Aucune recette avec des ingrédients renseignés."}</p>
            </div>
          )}
          {unavailableRecipes.length > 0 && <section className="col-span-full" aria-label="Recettes non réalisables avec le stock actuel">
            <h3>Recettes non réalisables avec le stock actuel</h3>
            <p>Stock insuffisant pour une portion. Signalez les demandes refusées si besoin.</p>
            <div className="recipes-grid">{unavailableRecipes.map((recipe) => <Card key={recipe.id} className="recipe-card">
              <strong>{recipe.name}</strong>
              <Button size="sm" variant="outline" onClick={() => setRefusalRecipe(recipe)}>Signaler un refus</Button>
              <Button size="sm" variant="outline" onClick={(event) => openRecipeEditor(recipe, event.currentTarget)}>Modifier la recette</Button>
            </Card>)}</div>
          </section>}
          {incompleteRecipes.length > 0 && <section className="col-span-full" aria-label="Recettes sans ingrédients renseignés">
            <p role="status">{incompleteRecipes.length} recette{incompleteRecipes.length > 1 ? "s" : ""} sans ingrédients renseignés ne peuvent pas être produites.</p>
            {incompleteRecipes.map((recipe) => <Card key={recipe.id} className="recipe-card"><strong>{recipe.name}</strong>
              <Button size="sm" variant="outline" onClick={(event) => openRecipeEditor(recipe, event.currentTarget)}>Compléter la recette</Button>
            </Card>)}
          </section>}
        </div>
      )}

      {displayedTab === "history" && productions.length > 0 && <section aria-label="Journal de production">
        <h2>Productions enregistrées</h2>
        {productions.map((item) => <Card key={item.id}><strong>{item.recipeName}</strong>
          <p>{item.portions} portions · {format(parseISO(item.date.slice(0, 10)), "dd/MM/yyyy")} · {item.kind === "refusal" ? "Demandes refusées" : item.kind === "record" ? "Préparation notée — stock inchangé" : "Production réalisée — stock déduit"}</p>
          {item.recipeVersion && <p>Version recette {item.recipeVersion.version} · rendement {item.recipeVersion.yieldPortions} portions · effet {item.recipeVersion.effectiveFrom ? format(parseISO(item.recipeVersion.effectiveFrom.slice(0, 10)), "dd/MM/yyyy") : "date historique inconnue"}</p>}
          {item.notes && <p>{item.notes}</p>}</Card>)}
      </section>}

      <RecordProductionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecord={handleRecordProduction}
      />

      <ProductionConfirmModal
        key={`${selectedRecipe?.id ?? "none"}-${isProductionModalOpen ? "open" : "closed"}`}
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        recipe={selectedRecipe}
        maxYield={selectedRecipe ? getMaxYield(selectedRecipe) : 0}
        costPerPortion={selectedRecipe ? getIngredientCost(selectedRecipe) : null}
        getProductName={getProductName}
        getProductUnit={getProductUnit}
        onConfirm={handleConfirmProduction}
      />
      {refusalRecipe && <ReportRefusalModal recipe={refusalRecipe} onClose={() => setRefusalRecipe(null)} onConfirm={handleReportRefusal} />}
    </div>
  );
};

export default Recipes;
