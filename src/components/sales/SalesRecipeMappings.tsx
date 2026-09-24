import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSaleRecipeMapping, getSaleRecipeMappings, type SaleRecipeMappingItem } from "../../services/salesService";
import { getRecipes } from "../../services/recipeService";
import type { Recipe } from "../../types";
import Button from "../common/Button";

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const message = (error: unknown) => error instanceof Error ? error.message : "Réessayez.";
const currentMapping = (item: SaleRecipeMappingItem, date: string) => item.mappings.find((mapping) => mapping.effectiveFrom <= date);

export default function SalesRecipeMappings({ itemCount }: { itemCount: number }) {
  const [items, setItems] = useState<SaleRecipeMappingItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(parisToday);
  const [portions, setPortions] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [status, setStatus] = useState("");
  const operationId = useRef(crypto.randomUUID());
  const selectedIdRef = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    void Promise.all([getSaleRecipeMappings(), getRecipes()]).then(([mappingItems, recipeRows]) => {
      if (!active) return;
      setItems(mappingItems); setRecipes(recipeRows);
      if (!mappingItems.some((item) => item.id === selectedIdRef.current)) {
        const first = mappingItems[0];
        selectedIdRef.current = first?.id ?? "";
        setSelectedId(first?.id ?? "");
        const current = first && currentMapping(first, parisToday());
        setRecipeId(current?.recipeId ?? first?.suggestedRecipeId ?? "");
        setPortions(String(current?.portionsPerItem ?? 1));
        setEffectiveFrom(parisToday());
      }
    }).catch((cause: unknown) => {
      if (active) setLoadError(message(cause));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemCount, reload]);

  const item = items.find((row) => row.id === selectedId);
  const current = item && currentMapping(item, parisToday());
  const recipe = recipes.find((row) => row.id === recipeId);
  const hasDatedVersion = Boolean(recipe?.versions.some((version) => version.effectiveFrom !== null && version.effectiveFrom <= effectiveFrom));

  const selectItem = (id: string) => {
    const next = items.find((row) => row.id === id);
    selectedIdRef.current = id; setSelectedId(id); setError(""); setStatus(""); operationId.current = crypto.randomUUID();
    const active = next && currentMapping(next, parisToday());
    setRecipeId(active?.recipeId ?? next?.suggestedRecipeId ?? "");
    setPortions(String(active?.portionsPerItem ?? 1)); setEffectiveFrom(parisToday());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item || !recipe || !hasDatedVersion) return;
    setSaving(true); setError(""); setStatus("");
    try {
      const saved = await createSaleRecipeMapping({ saleItemId: item.id, recipeId: recipe.id,
        expectedRevision: item.revision, operationId: operationId.current, effectiveFrom, portionsPerItem: Number(portions) });
      setItems((currentItems) => currentItems.map((row) => row.id === item.id ? { ...row, revision: saved.revision,
        mappings: [saved, ...row.mappings] } : row));
      operationId.current = crypto.randomUUID();
      setStatus(`Correspondance validée pour le ${saved.effectiveFrom} : ${saved.portionsPerItem} portion(s) par article vendu.`);
    } catch (cause) { setError(message(cause)); }
    finally { setSaving(false); }
  };

  return <section className="sales-panel" aria-labelledby="sales-recipe-mappings-title">
    <h2 id="sales-recipe-mappings-title" ref={heading} tabIndex={-1}>Articles vendus et recettes</h2>
    <p>Une suggestion de nom reste à confirmer. La correspondance datée sert à une estimation de consommation ; elle ne crée aucune production ni mouvement de stock.</p>
    {loading ? <p role="status">Chargement des correspondances…</p> : loadError ? <div role="alert"><p>Correspondances indisponibles : {loadError}</p>
      <Button type="button" variant="outline" onClick={() => { setReload((value) => value + 1); requestAnimationFrame(() => heading.current?.focus()); }}>Réessayer</Button></div> : !items.length ?
      <p>Créez un article vendu avant de l’associer à une recette.</p> : !recipes.length ?
        <p>Créez et datez une version de recette avant de valider une correspondance.</p> : <>
          <form className="sales-form" onSubmit={(event) => void submit(event)}>
            <label>Article vendu<select required value={selectedId} onChange={(event) => selectItem(event.target.value)}>
              {items.map((saleItem) => <option key={saleItem.id} value={saleItem.id}>{saleItem.name}</option>)}
            </select></label>
            <label>Recette proposée<select required value={recipeId} onChange={(event) => {
              setRecipeId(event.target.value); setError(""); setStatus(""); operationId.current = crypto.randomUUID();
            }}>
              <option value="">Choisir une recette</option>
              {recipes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select></label>
            <label>Portions par article vendu<input type="number" required min="0.001" max="1000000" step="0.001"
              value={portions} onChange={(event) => { setPortions(event.target.value); operationId.current = crypto.randomUUID(); }} /></label>
            <label>Date d’effet<input type="date" required value={effectiveFrom} onChange={(event) => {
              setEffectiveFrom(event.target.value); operationId.current = crypto.randomUUID();
            }} /></label>
            <Button type="submit" disabled={saving || !item || !recipe || !hasDatedVersion}>
              {saving ? "Validation…" : "Valider la correspondance"}
            </Button>
          </form>
          {item && <div className="sales-recipe-mapping-details">
            {current ? <p>Correspondance active : <strong>{current.recipeName}</strong>, {current.portionsPerItem} portion(s) par article depuis le {current.effectiveFrom}.</p> :
              <p>Aucune correspondance validée active pour cet article vendu.</p>}
            {!current && item.suggestedRecipeId && <p>Suggestion automatique par nom identique : {recipes.find((row) => row.id === item.suggestedRecipeId)?.name}. Vérifiez-la avant validation.</p>}
            {recipeId && !hasDatedVersion && <p role="status">Aucune version datée de cette recette n’est connue au {effectiveFrom}. Datez d’abord la recette dans Recettes.</p>}
            {item.mappings.length > 0 && <details><summary>Historique des correspondances ({item.mappings.length})</summary>
              <ol>{item.mappings.map((mapping) => <li key={mapping.id}>
                Révision {mapping.revision} · effet {mapping.effectiveFrom} · {mapping.recipeName} · {mapping.portionsPerItem} portion(s)/article · validée par {mapping.actorId}
              </li>)}</ol>
            </details>}
          </div>}
          {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
        </>}
  </section>;
}
