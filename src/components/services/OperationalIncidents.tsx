import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getProducts } from "../../services/productService";
import { getPendingOrders } from "../../services/orderService";
import { getIncidentLots, getIncidents, recordIncident, resolveIncident, type OperationalIncident } from "../../services/serviceOperationsService";
import type { IncidentInput } from "../../../shared/serviceOperations";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { Product, Recipe } from "../../types";

const labels: Record<IncidentInput["kind"], string> = {
  delivery_delay: "Livraison reportée", unavailable: "Produit indisponible", lot_discarded: "Lot écarté",
  stockout: "Rupture", substitution: "Substitution", demand_change: "Fréquentation inattendue",
};

type IncidentReference = { id: string; productId: string; label: string };

async function loadReferences(kind: "delivery_delay" | "lot_discarded"): Promise<IncidentReference[]> {
  if (kind === "delivery_delay") {
    const orders = await getPendingOrders();
    return orders.flatMap(order => order.lines).filter(line => line.remainingQuantity > 0).map(line => ({
      id: line.id, productId: line.productId,
      label: `${line.productName} · ${line.supplierName} · ${line.expectedDeliveryDate ?? "date attendue inconnue"}`,
    }));
  }
  const { lots } = await getIncidentLots();
  return lots.map(lot => ({
    id: lot.id, productId: lot.productId,
    label: `Reçu ${lot.receivedAt ?? "date inconnue"} · échéance ${lot.expiresAt ?? "inconnue"} · ${lot.remainingQuantity} restant · ${lot.id.slice(-6)}`,
  }));
}

function ResolveIncident({ incident, onChanged }: { incident: OperationalIncident; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [operationId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await resolveIncident(incident.id, incident.revision, note, operationId); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de clore le suivi."); }
    finally { setBusy(false); }
  };
  return <details><summary>Consigner la réponse du responsable</summary><form onSubmit={submit} className="sales-form">
    <label>Action réalisée ou décision prise<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
    <p>Cette validation clôt le suivi uniquement. Les commandes, productions, pertes et ventes se confirment dans leurs écrans respectifs.</p>
    <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Valider la réponse et clore le suivi"}</Button>
    {error && <p role="alert">{error}</p>}
  </form></details>;
}
export default function OperationalIncidents({ date, slot, loadRecipes }: {
  date: string; slot: ServiceSlot; loadRecipes: () => Promise<Recipe[]>;
}) {
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [products, setProducts] = useState<Product[]>([]), [recipes, setRecipes] = useState<Recipe[]>([]);
  const [kind, setKind] = useState<IncidentInput["kind"]>("stockout");
  const [productId, setProductId] = useState(""), [recipeId, setRecipeId] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const [referenceResult, setReferenceResult] = useState<{ attempt: number; options: IncidentReference[]; error?: string } | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const productField = useRef<HTMLSelectElement>(null);
  const referenceField = useRef<HTMLSelectElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const retryFocusPending = useRef(false);
  const [quantity, setQuantity] = useState(""), [note, setNote] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0), [operationId, setOperationId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let cancelled = false; setLoading(true); setLoadError("");
    void Promise.all([getIncidents(date, date), getProducts(), loadRecipes()])
      .then(([records, stock, cards]) => {
        if (cancelled) return;
        setIncidents(records); setProducts(stock); setRecipes(cards);
      }).catch((cause: unknown) => { if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Suivi indisponible."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, reload, loadRecipes]);
  const referenceKind = kind === "delivery_delay" || kind === "lot_discarded" ? kind : null;
  const choices = formOpen && referenceResult?.attempt === referenceAttempt ? referenceResult : null;
  const referenceOptions = choices?.options.filter(option => kind === "delivery_delay" || option.productId === productId) ?? [];
  const selectedReference = referenceOptions.find(option => option.id === referenceId && option.productId === productId);
  const canSubmit = !busy && !loading && (!referenceKind || !!selectedReference);
  useEffect(() => {
    if (!formOpen || !details.current?.open || !referenceKind) return;
    let cancelled = false;
    void loadReferences(referenceKind).then(options => {
      if (!cancelled) setReferenceResult({ attempt: referenceAttempt, options });
    }, (cause: unknown) => {
      if (!cancelled) setReferenceResult({ attempt: referenceAttempt, options: [],
        error: cause instanceof Error ? cause.message : "Choix indisponibles." });
    });
    return () => { cancelled = true; };
  }, [formOpen, referenceKind, referenceAttempt]);
  useEffect(() => {
    if (!choices || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    const target = choices.error ? retryButton.current
      : referenceField.current?.disabled ? productField.current : referenceField.current;
    target?.focus();
  }, [choices]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await recordIncident({ operationId, serviceDate: date, serviceSlot: slot, kind,
        productId: productId || null, recipeId: recipeId || null, lotId: kind === "lot_discarded" ? selectedReference?.id ?? null : null,
        orderLineId: kind === "delivery_delay" ? selectedReference?.id ?? null : null, quantity: quantity ? Number(quantity) : null,
        unit: quantity ? products.find(p => p.id === productId)?.unit ?? "portion" : null, note });
      setOperationId(crypto.randomUUID()); setNote(""); setQuantity(""); setReload(n => n + 1);
      setNotice("Signalement enregistré. Aucun stock, achat ni production n'a été modifié.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Signalement non enregistré."); }
    finally { setBusy(false); }
  };
  const changeKind = (value: IncidentInput["kind"]) => {
    setKind(value); setReferenceId(""); setReferenceAttempt(n => n + 1); setOperationId(crypto.randomUUID());
  };
  const changeProduct = (value: string) => { setProductId(value); setReferenceId(""); };
  const requiresLot = kind === "lot_discarded";
  return <section className="sales-panel" aria-labelledby="incidents-title"><h2 id="incidents-title">Incidents et réponses du responsable</h2>
    <p>Signalez un fait observé et son service concerné. Les propositions restent à confirmer ; aucune opération n’est déclenchée par ce formulaire.</p>
    {loading && <p role="status">Chargement des signalements…</p>}{loadError && <p role="alert">{loadError}</p>}{notice && <p role="status">{notice}</p>}
    {!loading && !loadError && !incidents.some(i => i.serviceSlot === slot || i.serviceSlot === null) && <p>Aucun incident déclaré pour ce service.</p>}
    <details ref={details} onToggle={event => {
      const open = event.currentTarget.open;
      setFormOpen(open);
      if (open) setReferenceAttempt(n => n + 1);
    }}><summary>Déclarer un incident pour ce service</summary><form onSubmit={submit} className="sales-form">
      <label>Situation<select value={kind} onChange={e => changeKind(e.target.value as IncidentInput["kind"])}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Produit concerné<select ref={productField} required={requiresLot} value={productId} onChange={e => changeProduct(e.target.value)}><option value="">Sans produit précis</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {referenceKind && <>
        {!choices && <p role="status">{requiresLot ? "Chargement des lots…" : "Chargement des lignes de commande…"}</p>}
        {choices?.error && <><p role="alert">{choices.error}</p><Button ref={retryButton} type="button" variant="outline" onClick={() => {
          retryFocusPending.current = document.activeElement === retryButton.current;
          setReferenceAttempt(n => n + 1);
        }}>{requiresLot ? "Recharger les lots" : "Recharger les lignes de commande"}</Button></>}
        {choices && !choices.error && !referenceOptions.length && (!requiresLot || productId) && <p role="status">
          {requiresLot ? "Aucun lot enregistré pour ce produit." : "Aucune ligne de commande en attente de réception."}
        </p>}
        <label>{requiresLot ? "Lot concerné" : "Ligne de commande"}<select ref={referenceField} required
          disabled={!choices || !!choices.error || (requiresLot && !productId)} value={selectedReference?.id ?? ""} onChange={e => {
            const option = referenceOptions.find(item => item.id === e.target.value);
            setReferenceId(option?.id ?? "");
            if (option) setProductId(option.productId);
          }}><option value="">{requiresLot ? "Choisir le lot" : "Choisir la commande"}</option>
          {referenceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      </>}
      <label>Recette concernée<select required={kind === "substitution"} value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Sans recette précise</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label>Quantité concernée, facultative ({products.find(p => p.id === productId)?.unit ?? "portions"})<input type="number" min="0.001" max="1000000" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <label>Constat et conséquence observée<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <Button type="submit" disabled={!canSubmit}>{busy ? "Enregistrement…" : "Enregistrer le signalement"}</Button>
      {error && <p role="alert">{error}</p>}
    </form></details>
    <Button type="button" variant="outline" disabled={busy || loading} onClick={() => {
      setReload(n => n + 1);
      if (details.current?.open && referenceKind) setReferenceAttempt(n => n + 1);
    }}>Recharger les signalements</Button>
    <div className="sales-actions"><Link to="/orders">Revoir les achats et réceptions</Link><Link to="/stocks">Revoir les lots et pertes</Link><Link to="/recipes">Enregistrer une préparation</Link></div>
    {incidents.filter(i => i.serviceSlot === slot || i.serviceSlot === null).map(incident => <article key={incident.id}>
      <h3>{labels[incident.kind]} · {incident.status === "open" ? "à traiter" : "suivi clos"}</h3><p>{incident.note}</p>
      <ul>{incident.consequences.map(c => <li key={c}>{c}</li>)}</ul>
      {incident.status === "open" ? <><h4>Ajustements à examiner</h4><ul>{incident.suggestions.map(s => <li key={s}>{s}</li>)}</ul>
        <ResolveIncident incident={incident} onChanged={() => setReload(n => n + 1)} /></> : <p>Réponse enregistrée : {incident.actionNote}</p>}
    </article>)}
  </section>;
}
