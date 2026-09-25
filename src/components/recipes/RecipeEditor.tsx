import { useEffect, useState, type FormEvent, type RefObject } from "react";
import type { Product, Recipe } from "../../types";
import type { RecipeSuggestion } from "../../domain/recipes/recipeSuggestionPolicy";
import { createRecipe, updateRecipe, type RecipeMutation } from "../../services/recipeService";
import Button from "../common/Button";

interface RecipeDraft {
  name: string; category: Recipe["category"]; prepTime: number; yieldPortions: number;
  effectiveFrom: string; ingredients: Array<{ productId: string; quantity: number }>;
}
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const blankDraft = (): RecipeDraft => ({ name: "", category: "Plat", prepTime: 15, yieldPortions: 1,
  effectiveFrom: today(), ingredients: [{ productId: "", quantity: 0.1 }] });

export default function RecipeEditor({ open, recipe, products, headingRef, initialSuggestion, onCreate, onClose, onSaved }: {
  open: boolean; recipe: Recipe | null; products: Product[]; headingRef: RefObject<HTMLHeadingElement | null>;
  initialSuggestion: RecipeSuggestion | null;
  onCreate: (trigger: HTMLButtonElement) => void; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(blankDraft);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setDraft(recipe ? { name: recipe.name, category: recipe.category, prepTime: recipe.prepTime,
      yieldPortions: recipe.yieldPortions, effectiveFrom: today(),
      ingredients: recipe.ingredients.map(({ productId, quantity }) => ({ productId, quantity })) }
      : initialSuggestion ? { name: initialSuggestion.name, category: initialSuggestion.category,
        prepTime: initialSuggestion.prepTime, yieldPortions: initialSuggestion.yieldPortions,
        effectiveFrom: initialSuggestion.effectiveFrom,
        ingredients: initialSuggestion.ingredients.map(({ productId, quantity }) => ({ productId, quantity })) }
        : blankDraft());
    setOperationId(crypto.randomUUID()); setError("");
    requestAnimationFrame(() => headingRef.current?.focus());
  }, [open, recipe, initialSuggestion, headingRef]);

  const setIngredient = (index: number, next: Partial<RecipeDraft["ingredients"][number]>) =>
    setDraft((current) => ({ ...current, ingredients: current.ingredients.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...next } : row) }));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    const input: RecipeMutation = { ...draft, operationId,
      ...(initialSuggestion?.sourceReceipt ? { sourceReceiptLineId: initialSuggestion.sourceReceipt.receiptLineId } : {}) };
    try {
      if (recipe) await updateRecipe(recipe.id, recipe.revision, input);
      else await createRecipe(input);
      await onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Recette non enregistrée."); }
    finally { setSaving(false); }
  };

  return <section className="recipe-editor-panel" aria-labelledby="recipe-editor-section-title">
    <div className="recipe-editor-heading">
      <h2 id="recipe-editor-section-title">Gestion des recettes</h2>
      {!open && <Button type="button" onClick={(event) => onCreate(event.currentTarget)}>Créer une recette</Button>}
    </div>
    {open && <form className="recipe-editor-form" onSubmit={(event) => void submit(event)}>
      <h3 id="recipe-editor-title" ref={headingRef} tabIndex={-1}>{recipe ? `Modifier ${recipe.name}` : initialSuggestion ? "Revoir la proposition" : "Nouvelle recette"}</h3>
      {initialSuggestion && <p>Cette proposition part de « {initialSuggestion.sourceProductName} »{initialSuggestion.sourceReceipt
        ? ` — livraison ${initialSuggestion.sourceReceipt.reference}.` : "."} Corrigez les ingrédients, les quantités, le rendement et la date. La créer l’ajoute au catalogue pour alimenter les estimations ; aucune vente, perte ou sortie de stock n’est enregistrée.</p>}
      {recipe && <p>Version actuelle : {recipe.version} · rendement {recipe.yieldPortions} portions · date d’effet {recipe.effectiveFrom ?? "historique antérieur, date inconnue"}.</p>}
      <div className="recipe-editor-fields">
        <label>Nom de la recette<input required maxLength={120} value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Catégorie<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Recipe["category"] })}>
          <option value="Plat">Plat</option><option value="Entrée">Entrée</option><option value="Dessert">Dessert</option>
        </select></label>
        <label>Préparation (minutes)<input type="number" required min="0" max="10080" step="1" value={draft.prepTime}
          onChange={(event) => setDraft({ ...draft, prepTime: Number(event.target.value) })} /></label>
        <label>Rendement du lot (portions)<input type="number" required min="1" max="10000" step="1" value={draft.yieldPortions}
          onChange={(event) => setDraft({ ...draft, yieldPortions: Number(event.target.value) })} /></label>
        <label>Date d’effet<input type="date" required max={today()} min={recipe?.effectiveFrom ?? undefined} value={draft.effectiveFrom}
          onChange={(event) => setDraft({ ...draft, effectiveFrom: event.target.value })} /></label>
      </div>
      <fieldset className="recipe-editor-ingredients">
        <legend>Ingrédients pour le lot ({draft.yieldPortions} portions)</legend>
        <p>La quantité est exprimée dans l’unité du produit ; elle sera divisée par le rendement pour calculer une portion.</p>
        {draft.ingredients.map((ingredient, index) => {
          const selectedProduct = products.find((product) => product.id === ingredient.productId);
          const sourceProduct = initialSuggestion?.sourceReceipt && ingredient.productId === initialSuggestion.sourceProductId;
          return <div className="recipe-editor-ingredient" key={index}>
            <label>Produit {index + 1}{sourceProduct ? " (entrée reçue)" : ""}<select required value={ingredient.productId}
              disabled={sourceProduct}
              onChange={(event) => {
                const productId = event.target.value;
                const product = products.find((candidate) => candidate.id === productId);
                setIngredient(index, { productId, ...(product?.unit === "pcs" ? { quantity: Math.max(1, Math.ceil(ingredient.quantity)) } : {}) });
              }}>
              <option value="">Choisir un produit</option>
              {products.map((product) => <option key={product.id} value={product.id}
                disabled={draft.ingredients.some((row, rowIndex) => rowIndex !== index && row.productId === product.id)}>
                {product.name} ({product.unit})
              </option>)}
            </select></label>
            <label>Quantité ({selectedProduct?.unit ?? "unité"})<input type="number" required min={selectedProduct?.unit === "pcs" ? 1 : 0.001}
              max="1000000" step={selectedProduct?.unit === "pcs" ? 1 : 0.001}
              value={ingredient.quantity} onChange={(event) => setIngredient(index, { quantity: Number(event.target.value) })} /></label>
            {!sourceProduct && <Button type="button" size="sm" variant="outline" disabled={draft.ingredients.length === 1}
              aria-label={`Retirer le produit ${index + 1}`} onClick={() => setDraft((current) => ({ ...current,
                ingredients: current.ingredients.filter((_, rowIndex) => rowIndex !== index) }))}>Retirer</Button>}
          </div>;
        })}
        <Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current,
          ingredients: [...current.ingredients, { productId: "", quantity: 0.1 }] }))}>Ajouter un ingrédient</Button>
      </fieldset>
      {recipe && <details className="recipe-version-history"><summary>Historique des versions ({recipe.versions.length})</summary>
        <ol>{recipe.versions.map((version) => <li key={version.version}>
          <strong>Version {version.version} · effet {version.effectiveFrom ?? "inconnu"} · {version.yieldPortions} portions</strong>
          <span>{version.name} · {version.category} · {version.prepTime} min · auteur {version.actorId} · {new Date(version.createdAt).toLocaleString("fr-FR")}</span>
          {version.ingredients.map((ingredient) => <span key={ingredient.productId}>{ingredient.productName} · {ingredient.quantity} {ingredient.unit}</span>)}
        </li>)}</ol>
      </details>}
      {error && <p role="alert">{error}</p>}
      <div className="recipe-editor-actions">
        <Button type="submit" disabled={saving || !products.length}>{saving ? "Enregistrement…" : recipe ? "Enregistrer une nouvelle version" : "Créer la recette"}</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Annuler</Button>
      </div>
    </form>}
  </section>;
}
