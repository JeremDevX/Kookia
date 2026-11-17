import { useEffect, useRef, useState } from "react";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import { ChefHat } from "lucide-react";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import RecordProductionModal from "../components/recipes/RecordProductionModal";
import ProductionConfirmModal from "../components/recipes/ProductionConfirmModal";
import ReportRefusalModal from "../components/recipes/ReportRefusalModal";
import RecipeEditor from "../components/recipes/RecipeEditor";
import RecipeCsvImport from "../components/recipes/RecipeCsvImport";
import RecipeCandidates from "../components/recipes/RecipeCandidates";
import RecipeCatalog from "../components/recipes/RecipeCatalog";
import RecipeSheets from "../components/recipes/RecipeSheets";
import RecipeProductionHistory from "../components/recipes/RecipeProductionHistory";
import ProducibleRecipes from "../components/recipes/ProducibleRecipes";
import ReceiptRecipeSuggestion from "../components/recipes/ReceiptRecipeSuggestion";
import { useRecipes } from "../hooks/useRecipes";
import { useRecipeProduction } from "../features/recipes/useRecipeProduction";
import { recipeStockWarnings } from "../features/recipes/productionAvailability";
import { getRecipeView, recipeViewHref, recipeViewParams, type RecipeView } from "../features/recipes/recipeNavigation";
import { formatLocalISODate } from "../utils/date";
import type { Recipe } from "../types";
import type { ImportedIngredient } from "../features/recipes/recipeCsv";
import type { RecipeSuggestion } from "../domain/recipes/recipeSuggestionPolicy";
import "../styles/Workspace.css";
import "./Recipes.css";

type EditorFlow = { kind: "csv" }
  | { kind: "editor"; recipe: Recipe | null; suggestion: RecipeSuggestion | null; imported: ImportedIngredient[] | null };
type ProductionDialog = { kind: "preparation" }
  | { kind: "production"; recipe: Recipe; portions: number }
  | { kind: "refusal"; recipe: Recipe };

export default function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get("product");
  const receiptLineId = searchParams.get("incomingReceiptLineId");
  const displayedTab = getRecipeView(searchParams);
  const changeTab = (view: RecipeView) => setSearchParams(recipeViewParams(searchParams, view));
  const allRecipesHref = recipeViewHref(searchParams, "catalog");
  const { recipes, products, loading, error, refetch, productsLoading, productsError, productsReady, refreshProducts,
    getMaxYield, getIngredientCost, getProductName, getProductUnit } = useRecipes();
  const { productions, productionError, refreshProductions, recordPreparation,
    confirmProduction, reportRefusal } = useRecipeProduction(refetch, refreshProducts);

  const [editorFlow, setEditorFlow] = useState<EditorFlow | null>(null);
  const [dialog, setDialog] = useState<ProductionDialog | null>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const editorOrigin = useRef<HTMLButtonElement | null>(null);
  const csvOpen = editorFlow?.kind === "csv";
  const csvBlocker = useBlocker(csvOpen);

  useEffect(() => {
    if (csvBlocker.state !== "blocked") return;
    if (!window.confirm("L’import en cours sera perdu. Quitter cette page ?")) {
      csvBlocker.reset();
      return;
    }
    const timer = window.setTimeout(() => {
      setEditorFlow(null);
      csvBlocker.proceed();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [csvBlocker]);

  useBeforeUnloadWarning(csvOpen);

  const edit = (recipe: Recipe | null, trigger: HTMLButtonElement, suggestion: RecipeSuggestion | null = null) => {
    editorOrigin.current = trigger;
    setEditorFlow({ kind: "editor", recipe, suggestion, imported: null });
  };
  const closeEditor = () => {
    setEditorFlow(null);
    requestAnimationFrame(() => {
      if (editorOrigin.current?.isConnected && !editorOrigin.current.disabled) editorOrigin.current.focus();
      else pageHeading.current?.focus();
    });
  };
  const handleRecipeSaved = async () => {
    await refetch();
    if (editorFlow?.kind !== "editor" || !editorFlow.suggestion) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("incomingReceiptLineId");
      return next;
    });
  };

  const startProduction = (recipe: Recipe, portions = 1) => setDialog({ kind: "production", recipe, portions });
  const startRefusal = (recipe: Recipe) => setDialog({ kind: "refusal", recipe });
  const closeDialog = () => {
    setDialog(null);
    requestAnimationFrame(() => { if (document.activeElement === document.body) pageHeading.current?.focus(); });
  };
  const editing = editorFlow !== null;
  const today = formatLocalISODate();
  const recipesWithYield = recipes.map((recipe) => ({ ...recipe, maxYield: getMaxYield(recipe) }));
  const matchingRecipes = productId
    ? recipesWithYield.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.productId === productId))
    : recipesWithYield;
  const producedRecipeIds = new Set(productions.filter((item) => item.kind === "production" && item.date.slice(0, 10) === today)
    .flatMap((item) => item.recipeId ? [item.recipeId] : []));
  const recipeDetails = { getProductName, getProductUnit, costPerPortion: getIngredientCost };

  return <div className="recipes-container workspace-page">
    {loading && <p role="status">Chargement des recettes…</p>}
    {error && <div role="alert"><p>{error.message}</p><Button onClick={() => void refetch()}>Réessayer</Button></div>}
    {productsLoading && <p role="status">Chargement du catalogue de produits…</p>}
    {productsError && <div role="alert"><p>Catalogue de produits indisponible. {productsError.message}</p>
      <Button onClick={() => void refreshProducts()}>Réessayer</Button></div>}
    {productionError && <div role="alert"><p>{productionError}</p><Button onClick={() => void refreshProductions()}>Réessayer</Button></div>}
    <div className="recipes-heading-panel"><header className="workspace-header">
      <div>
        <h1 ref={pageHeading} tabIndex={-1}>{productId ? `Recettes avec ${productsReady ? getProductName(productId) : "ce produit"}` : displayedTab === "sheets" ? "Fiches techniques" : "Mes recettes"}</h1>
        <p className="workspace-subtitle">{productId ? "Recettes contenant cet ingrédient, selon les lots proposés. Aucun surstock n'est déduit automatiquement." : displayedTab === "sheets" ? "Retrouvez les coûts et les quantités de vos recettes." : "Faisabilité selon les lots et recettes enregistrés. Les échéances dépassées sont exclues, les échéances inconnues restent à vérifier par le chef. La validation d'une production déduit les ingrédients du stock."}</p>
        {!productId && !receiptLineId && displayedTab === "catalog" && <a className="recipe-candidates-link" href="#recipe-candidates" onClick={(event) => {
          event.preventDefault(); document.querySelector<HTMLElement>("#recipe-candidates > summary")?.focus();
        }}>Voir les fiches candidates issues de pièces</a>}
      </div>
      <div className="recipes-header-actions">
        <Button disabled={editing} onClick={(event) => edit(null, event.currentTarget)}>{displayedTab === "sheets" ? "Créer une fiche" : "Nouvelle recette"}</Button>
        <Button type="button" variant="outline" disabled={editing || !productsReady} onClick={(event) => {
          editorOrigin.current = event.currentTarget; setEditorFlow({ kind: "csv" });
        }}>Importer une fiche CSV</Button>
        {!productId && <Button variant="outline" icon={<ChefHat size={17} />} onClick={() => setDialog({ kind: "preparation" })}>Noter une préparation hors catalogue</Button>}
      </div>
    </header>
    <div className="recipe-tabs" role="group" aria-label="Vues des recettes">
      <button type="button" aria-pressed={displayedTab === "catalog"} onClick={() => changeTab("catalog")}>Toutes les recettes · {loading ? "…" : error ? "—" : recipes.length}</button>
      <button type="button" aria-pressed={displayedTab === "anti-waste"} onClick={() => changeTab("anti-waste")}>Réalisables avec le stock</button>
      <button type="button" aria-pressed={displayedTab === "sheets"} onClick={() => changeTab("sheets")}>Fiches techniques</button>
      <button type="button" aria-pressed={displayedTab === "history"} onClick={() => changeTab("history")}>Produites cette semaine</button>
    </div></div>

    {receiptLineId && <ReceiptRecipeSuggestion key={receiptLineId} receiptLineId={receiptLineId} products={products}
      ready={productsReady} editing={editing} pageHeading={pageHeading} onReview={(suggestion, trigger) => edit(null, trigger, suggestion)} />}
    {editorFlow?.kind === "editor" && <>
      <p role="status">Enregistrez ou annulez la recette en cours avant d’en ouvrir une autre.</p>
      <RecipeEditor recipe={editorFlow.recipe} products={products} headingRef={editorHeading}
        initialSuggestion={editorFlow.suggestion} initialImport={editorFlow.imported}
        onClose={closeEditor} onSaved={handleRecipeSaved} />
    </>}
    {csvOpen && <RecipeCsvImport products={products} onClose={closeEditor}
      onApply={(imported) => setEditorFlow({ kind: "editor", recipe: null, suggestion: null, imported })} />}

    {productId && !loading && !error && <p className="recipes-context" role="status">{matchingRecipes.length} recette{matchingRecipes.length > 1 ? "s" : ""} trouvée{matchingRecipes.length > 1 ? "s" : ""}. <Link to={allRecipesHref}>Voir toutes les recettes</Link></p>}
    {displayedTab === "catalog" && !error && <RecipeCatalog editing={editing} recipes={recipesWithYield} loading={loading && recipes.length === 0}
      onEdit={edit} onProduce={startProduction} />}
    {displayedTab === "sheets" && !error && <RecipeSheets editing={editing} recipes={recipes} loading={loading && recipes.length === 0}
      costPerPortion={getIngredientCost} onEdit={edit} />}
    {!productId && !receiptLineId && <RecipeCandidates products={products} onRecipeConfirmed={refetch} />}
    {displayedTab === "anti-waste" && !loading && !error && productsReady &&
      <ProducibleRecipes {...recipeDetails} recipes={matchingRecipes} products={products} producedRecipeIds={producedRecipeIds}
        allRecipesHref={productId ? allRecipesHref : undefined} editing={editing}
        onEdit={edit} onProduce={startProduction} onRefusal={startRefusal} />}
    {displayedTab === "history" &&
      <RecipeProductionHistory {...recipeDetails} recipes={recipes} productions={productions} today={today}
        loading={loading} recipeError={Boolean(error)} editing={editing} onEdit={edit} onRefusal={startRefusal} />}

    <RecordProductionModal isOpen={dialog?.kind === "preparation"} onClose={closeDialog} onRecord={recordPreparation} />
    {dialog?.kind === "production" && <ProductionConfirmModal
      isOpen onClose={closeDialog} recipe={dialog.recipe} initialPortions={dialog.portions}
      maxYield={getMaxYield(dialog.recipe)} availabilityWarnings={productsReady ? recipeStockWarnings(dialog.recipe, products) : []}
      costPerPortion={getIngredientCost(dialog.recipe)} getProductName={getProductName} getProductUnit={getProductUnit}
      onConfirm={(quantity, operationId, serviceSlot) => confirmProduction(dialog.recipe, quantity, operationId, serviceSlot)} />}
    {dialog?.kind === "refusal" && <ReportRefusalModal recipe={dialog.recipe} onClose={closeDialog} onConfirm={reportRefusal} />}
  </div>;
}
