import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getSourceInvoice, getSourceInvoices, type SourceInvoiceDetail, type SourceInvoiceSummary } from "../../services/invoiceService";
import { createRecipeCandidate, decideRecipeCandidate, getRecipeCandidates, updateRecipeCandidate,
  type RecipeCandidate, type RecipeCandidateInput } from "../../services/recipeCandidateService";
import type { Product, Recipe } from "../../types";
import "./RecipeCandidates.css";

interface IngredientDraft {
  key: string;
  productId: string;
  quantity: number;
  sourceDocumentId: string;
  sourceLineNumber: string;
  sourceLabel: string;
}
interface CandidateDraft {
  name: string;
  category: Recipe["category"];
  prepTime: number;
  yieldPortions: number;
  effectiveFrom: string;
  ingredients: IngredientDraft[];
}
interface Props { products: Product[]; onRecipeConfirmed: () => Promise<void>; }

const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const newIngredient = (): IngredientDraft => ({ key: crypto.randomUUID(), productId: "", quantity: 0.1,
  sourceDocumentId: "", sourceLineNumber: "", sourceLabel: "" });
const blankDraft = (): CandidateDraft => ({ name: "", category: "Plat", prepTime: 15,
  yieldPortions: 4, effectiveFrom: today(), ingredients: [newIngredient()] });
const lineLabel = (line: { name: string; sourceQuantityText: string }) => `ligne : ${line.name} · ${line.sourceQuantityText}`;
const statusLabel: Record<RecipeCandidate["status"], string> = {
  pending: "À revoir — hypothèse non validée",
  confirmed: "Confirmée dans le bac de démonstration",
  rejected: "Écartée",
};

function draftFromCandidate(candidate: RecipeCandidate): CandidateDraft {
  return { ...candidate.recipe, ingredients: candidate.ingredients.map((ingredient) => ({ key: crypto.randomUUID(),
    productId: ingredient.productId, quantity: ingredient.quantity,
    sourceDocumentId: ingredient.evidence.sourceDocumentId,
    sourceLineNumber: String(ingredient.evidence.sourceLineNumber),
    sourceLabel: lineLabel({ name: ingredient.evidence.sourceName, sourceQuantityText: ingredient.evidence.sourceQuantityText }),
  })) };
}

function inputFromDraft(draft: CandidateDraft): RecipeCandidateInput {
  return { name: draft.name, category: draft.category, prepTime: draft.prepTime,
    yieldPortions: draft.yieldPortions, effectiveFrom: draft.effectiveFrom,
    ingredients: draft.ingredients.map((ingredient) => ({ productId: ingredient.productId,
      quantity: ingredient.quantity, sourceDocumentId: ingredient.sourceDocumentId,
      sourceLineNumber: Number(ingredient.sourceLineNumber) })) };
}

export default function RecipeCandidates({ products, onRecipeConfirmed }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<RecipeCandidate[]>([]);
  const [sources, setSources] = useState<SourceInvoiceSummary[]>([]);
  const [details, setDetails] = useState<Record<string, SourceInvoiceDetail>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<RecipeCandidate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<CandidateDraft>(blankDraft);
  const [rejectingId, setRejectingId] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const detailRequests = useRef(new Map<string, Promise<SourceInvoiceDetail>>());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRecipeCandidates();
      setAvailable(result.available);
      setCandidates(result.candidates);
      if (result.available) {
        const archived = await getSourceInvoices();
        setSources(archived.filter((source) => source.type === "invoice" && source.stockLineCount > 0));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Les fiches candidates sont indisponibles.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const getDetail = useCallback((id: string) => {
    const cached = details[id];
    if (cached) return Promise.resolve(cached);
    const pending = detailRequests.current.get(id);
    if (pending) return pending;
    const request = getSourceInvoice(id).then((detail) => {
      setDetails((current) => ({ ...current, [id]: detail }));
      return detail;
    }).finally(() => { detailRequests.current.delete(id); });
    detailRequests.current.set(id, request);
    return request;
  }, [details]);
  useEffect(() => {
    if (editorOpen) requestAnimationFrame(() => heading.current?.focus());
  }, [editorOpen]);
  useEffect(() => {
    if (!editing) return;
    const sourceIds = [...new Set(editing.ingredients.map((ingredient) => ingredient.evidence.sourceDocumentId))];
    void Promise.all(sourceIds.map((id) => getDetail(id))).catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "Lecture des pièces source impossible."));
  }, [editing, getDetail]);

  const openNew = (trigger: HTMLButtonElement) => {
    origin.current = trigger; setEditing(null); setDraft(blankDraft()); setError(""); setNotice(""); setEditorOpen(true);
  };
  const openEdit = (candidate: RecipeCandidate, trigger: HTMLButtonElement) => {
    origin.current = trigger; setEditing(candidate); setDraft(draftFromCandidate(candidate)); setError(""); setNotice(""); setEditorOpen(true);
  };
  const closeEditor = () => {
    setEditorOpen(false); setEditing(null); setDraft(blankDraft());
    requestAnimationFrame(() => { if (origin.current?.isConnected) origin.current.focus(); });
  };
  const updateIngredient = (key: string, values: Partial<IngredientDraft>) => setDraft((current) => ({
    ...current, ingredients: current.ingredients.map((row) => row.key === key ? { ...row, ...values } : row),
  }));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const input = inputFromDraft(draft);
      const saved = editing
        ? await updateRecipeCandidate(editing.id, editing.revision, crypto.randomUUID(), input)
        : await createRecipeCandidate(crypto.randomUUID(), input);
      setCandidates((current) => [saved, ...current.filter((candidate) => candidate.id !== saved.id)]);
      setNotice(editing ? "Fiche candidate enregistrée. Les quantités restent des hypothèses." : "Fiche candidate créée en attente de revue.");
      closeEditor();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Fiche candidate non enregistrée."); }
    finally { setSaving(false); }
  };

  const decide = async (candidate: RecipeCandidate, action: "confirm" | "reject") => {
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await decideRecipeCandidate(candidate.id, candidate.revision, crypto.randomUUID(), action);
      setCandidates((current) => current.map((item) => item.id === saved.id ? saved : item));
      setRejectingId("");
      if (action === "confirm") {
        await onRecipeConfirmed();
        setNotice("Recette confirmée et créée dans le bac de démonstration. Aucun stock n’a été modifié.");
      } else setNotice("Fiche candidate écartée ; aucune recette ni mouvement de stock créé.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Décision non enregistrée."); }
    finally { setSaving(false); }
  };

  const eligibleSources = sources;
  if (available !== true && !error) return null;

  return <section className="recipe-candidates" aria-labelledby="recipe-candidates-title">
    <div className="recipe-candidates-heading">
      <div><h2 id="recipe-candidates-title">Candidates depuis des pièces</h2>
        <p>Créez une hypothèse éditable à partir de lignes identifiées. Une facture ne prouve ni le plat, ni ses quantités ou son rendement.</p></div>
      {available === true && <Button type="button" variant="outline" hidden={editorOpen}
        onClick={(event) => openNew(event.currentTarget)}>Nouvelle candidate</Button>}
    </div>
    {error && <p className="recipe-candidates-alert" role="alert">{error}</p>}
    {notice && <p className="recipe-candidates-notice" role="status">{notice}</p>}
    {available !== true && error && <Button type="button" variant="outline" onClick={() => void refresh()}>Réessayer</Button>}
    {available === true && loading && <p role="status">Chargement des fiches…</p>}
    {available === true && sources.length === 0 && !loading && <p>Aucune facture avec ligne exploitable dans ce bac. Les avoirs et bons de livraison ne sont pas proposés.</p>}
    {available && candidates.length > 0 && <ul className="recipe-candidate-list">
      {candidates.map((candidate) => <li className="recipe-candidate" key={candidate.id}>
        <div className="recipe-candidate-title"><h3>{candidate.recipe.name}</h3><span>{statusLabel[candidate.status]}</span></div>
        <p>{candidate.recipe.category} · hypothèse pour {candidate.recipe.yieldPortions} portions · {candidate.recipe.prepTime} min · effet proposé {candidate.recipe.effectiveFrom}</p>
        <ul>{candidate.ingredients.map((ingredient) => <li key={ingredient.productId}>
          {ingredient.productName} — {ingredient.quantity} {ingredient.unit} par lot · <Link
            to={`/orders?source=${encodeURIComponent(ingredient.evidence.sourceDocumentId)}#invoices`}>
            Pièce source : {ingredient.evidence.sourceTitle} · date de travail {ingredient.evidence.sourceDate ?? "inconnue"} · ligne {ingredient.evidence.sourceLineNumber}, {ingredient.evidence.sourceName} ({ingredient.evidence.sourceQuantityText})
          </Link>
        </li>)}</ul>
        {candidate.recipeId && <p>Recette active créée ; aucune production n’est déclarée par cette confirmation.</p>}
        {candidate.status === "pending" && <div className="recipe-candidate-actions">
          <Button type="button" variant="outline" disabled={saving} onClick={(event) => openEdit(candidate, event.currentTarget)}>Modifier l’hypothèse</Button>
          <Button type="button" disabled={saving} onClick={() => void decide(candidate, "confirm")}>Confirmer comme recette</Button>
          <Button type="button" variant="outline" aria-expanded={rejectingId === candidate.id}
            aria-controls={`recipe-candidate-reject-${candidate.id}`} disabled={saving}
            onClick={() => setRejectingId((current) => current === candidate.id ? "" : candidate.id)}>
            {rejectingId === candidate.id ? "Annuler l’écartement" : "Écarter"}
          </Button>
          {rejectingId === candidate.id && <div id={`recipe-candidate-reject-${candidate.id}`} className="recipe-candidate-reject" role="group" aria-label={`Écarter ${candidate.recipe.name}`}>
            <p>Écarter cette hypothèse ? Elle restera consultable mais ne deviendra pas une recette.</p>
            <Button type="button" disabled={saving} onClick={() => void decide(candidate, "reject")}>Confirmer l’écartement</Button>
          </div>}
        </div>}
      </li>)}
    </ul>}
    {available === true && candidates.length === 0 && !loading && <p>Aucune fiche candidate enregistrée dans ce bac.</p>}
    {editorOpen && <form className="recipe-candidate-form" onSubmit={(event) => void submit(event)}>
      <h3 ref={heading} tabIndex={-1}>{editing ? `Modifier ${editing.recipe.name}` : "Nouvelle fiche candidate"}</h3>
      <p>Tout nom de plat, quantité, rendement et date d’effet est une hypothèse éditable. Aucun stock n’est crédité ou consommé ici.</p>
      <div className="recipe-candidate-fields">
        <label>Nom hypothétique de la recette<input required maxLength={120} value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
        <label>Catégorie<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Recipe["category"] }))}>
          <option value="Entrée">Entrée</option><option value="Plat">Plat</option><option value="Dessert">Dessert</option>
        </select></label>
        <label>Préparation hypothétique (min)<input type="number" min="0" max="10080" step="1" required value={draft.prepTime}
          onChange={(event) => setDraft((current) => ({ ...current, prepTime: Number(event.target.value) }))} /></label>
        <label>Rendement hypothétique (portions)<input type="number" min="1" max="10000" step="1" required value={draft.yieldPortions}
          onChange={(event) => setDraft((current) => ({ ...current, yieldPortions: Number(event.target.value) }))} /></label>
        <label>Date d’effet proposée<input type="date" required max={today()} value={draft.effectiveFrom}
          onChange={(event) => setDraft((current) => ({ ...current, effectiveFrom: event.target.value }))} /></label>
      </div>
      <fieldset><legend>Ingrédients supposés pour le lot</legend>
        <p>Pour chaque ingrédient, choisissez vous-même un produit et une ligne source. Une conversion d’unité n’est pas déduite.</p>
        {draft.ingredients.map((ingredient, index) => {
          const detail = details[ingredient.sourceDocumentId];
          const lines = detail?.stockLines ?? [];
          const candidateOption = ingredient.sourceLineNumber && ingredient.sourceLabel
            ? [{ sourceLineNumber: Number(ingredient.sourceLineNumber), label: ingredient.sourceLabel }] : [];
          const lineOptions = lines.length ? lines.map((line) => ({ sourceLineNumber: line.sourceLineNumber, label: lineLabel(line) })) : candidateOption;
          return <div className="recipe-candidate-ingredient" key={ingredient.key}>
            <label>Produit supposé {index + 1}<select required value={ingredient.productId}
              onChange={(event) => updateIngredient(ingredient.key, { productId: event.target.value })}>
              <option value="">Choisir un produit</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}
            </select></label>
            <label>Quantité par lot<input type="number" min="0.001" max="1000000" step="0.001" required value={ingredient.quantity}
              onChange={(event) => updateIngredient(ingredient.key, { quantity: Number(event.target.value) })} /></label>
            <label>Pièce source<select required value={ingredient.sourceDocumentId} onChange={(event) => {
              const sourceDocumentId = event.target.value;
              updateIngredient(ingredient.key, { sourceDocumentId, sourceLineNumber: "", sourceLabel: "" });
              if (sourceDocumentId) void getDetail(sourceDocumentId).catch((cause: unknown) =>
                setError(cause instanceof Error ? cause.message : "Lecture de la ligne source impossible."));
            }}>
              <option value="">Choisir une pièce</option>{eligibleSources.map((source) => <option key={source.id} value={source.id}>
                {source.date ?? "date inconnue"} · {source.title} ({source.stockLineCount} lignes)
              </option>)}
            </select></label>
            <label>Ligne source<select required value={ingredient.sourceLineNumber} disabled={!ingredient.sourceDocumentId || !lineOptions.length}
              onChange={(event) => {
                const line = lines.find((item) => item.sourceLineNumber === Number(event.target.value));
                updateIngredient(ingredient.key, { sourceLineNumber: event.target.value,
                  sourceLabel: line ? lineLabel(line) : ingredient.sourceLabel });
              }}>
              <option value="">Choisir une ligne</option>{lineOptions.map((line) => <option key={line.sourceLineNumber} value={line.sourceLineNumber}>{line.sourceLineNumber} · {line.label}</option>)}
            </select></label>
            <Button type="button" size="sm" variant="outline" aria-label={`Retirer l’ingrédient ${index + 1}`}
              disabled={draft.ingredients.length === 1} onClick={() => setDraft((current) => ({
                ...current, ingredients: current.ingredients.filter((row) => row.key !== ingredient.key),
              }))}>Retirer</Button>
          </div>;
        })}
        <Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => ({
          ...current, ingredients: [...current.ingredients, newIngredient()],
        }))}>Ajouter un ingrédient</Button>
      </fieldset>
      <div className="recipe-candidate-actions">
        <Button type="submit" disabled={saving || !products.length}>{saving ? "Enregistrement…" : editing ? "Enregistrer les corrections" : "Enregistrer en attente"}</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={closeEditor}>Annuler</Button>
      </div>
    </form>}
  </section>;
}
