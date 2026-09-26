import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getProducts } from "../../services/productService";
import { getRecipes } from "../../services/recipeService";
import { getOrders } from "../../services/orderService";
import { getIncidentLots, getIncidents, recordIncident, resolveIncident, type OperationalIncident } from "../../services/serviceOperationsService";
import type { IncidentInput } from "../../../shared/serviceOperations";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { Product, Recipe } from "../../types";

const labels: Record<IncidentInput["kind"], string> = {
  delivery_delay: "Livraison reportée", unavailable: "Produit indisponible", lot_discarded: "Lot écarté",
  stockout: "Rupture", substitution: "Substitution", demand_change: "Fréquentation inattendue",
};
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
export default function OperationalIncidents({ date, slot }: { date: string; slot: ServiceSlot }) {
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [products, setProducts] = useState<Product[]>([]), [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getOrders>>>([]);
  const [lots, setLots] = useState<Awaited<ReturnType<typeof getIncidentLots>>["lots"]>([]);
  const [kind, setKind] = useState<IncidentInput["kind"]>("stockout");
  const [productId, setProductId] = useState(""), [recipeId, setRecipeId] = useState("");
  const [lotId, setLotId] = useState(""), [orderLineId, setOrderLineId] = useState("");
  const [quantity, setQuantity] = useState(""), [note, setNote] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0), [operationId, setOperationId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let cancelled = false; setLoading(true); setError("");
    void Promise.all([getIncidents(date, date), getProducts(), getRecipes(), getOrders(), getIncidentLots()])
      .then(([records, stock, cards, purchases, lotData]) => {
        if (cancelled) return;
        setIncidents(records); setProducts(stock); setRecipes(cards); setOrders(purchases); setLots(lotData.lots);
      }).catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Suivi indisponible."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, reload]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await recordIncident({ operationId, serviceDate: date, serviceSlot: slot, kind,
        productId: productId || null, recipeId: recipeId || null, lotId: kind === "lot_discarded" ? lotId || null : null,
        orderLineId: kind === "delivery_delay" ? orderLineId || null : null, quantity: quantity ? Number(quantity) : null,
        unit: quantity ? products.find(p => p.id === productId)?.unit ?? "portion" : null, note });
      setOperationId(crypto.randomUUID()); setNote(""); setQuantity(""); setReload(n => n + 1);
      setNotice("Signalement enregistré. Aucun stock, achat ni production n'a été modifié.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Signalement non enregistré."); }
    finally { setBusy(false); }
  };
  const changeKind = (value: IncidentInput["kind"]) => { setKind(value); setLotId(""); setOrderLineId(""); setOperationId(crypto.randomUUID()); };
  return <section className="sales-panel" aria-labelledby="incidents-title"><h2 id="incidents-title">Incidents et réponses du responsable</h2>
    <p>Signalez un fait observé et son service concerné. Les propositions restent à confirmer ; aucune opération n’est déclenchée par ce formulaire.</p>
    {loading && <p role="status">Chargement des signalements…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <Button type="button" variant="outline" disabled={busy || loading} onClick={() => setReload(n => n + 1)}>Recharger les signalements</Button>
    <details><summary>Déclarer un incident pour ce service</summary><form onSubmit={submit} className="sales-form">
      <label>Situation<select value={kind} onChange={e => changeKind(e.target.value as IncidentInput["kind"])}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Produit concerné<select required={kind === "lot_discarded"} value={productId} onChange={e => { setProductId(e.target.value); setLotId(""); setOrderLineId(""); }}><option value="">Sans produit précis</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {kind === "lot_discarded" && <label>Lot concerné<select required value={lotId} onChange={e => setLotId(e.target.value)}><option value="">Choisir le lot</option>{lots.filter(l => l.productId === productId).map(l => <option key={l.id} value={l.id}>Reçu {l.receivedAt ?? "date inconnue"} · échéance {l.expiresAt ?? "inconnue"} · {l.remainingQuantity} restant · {l.id.slice(-6)}</option>)}</select></label>}
      {kind === "delivery_delay" && <label>Ligne de commande<select required value={orderLineId} onChange={e => {
        const line = orders.flatMap(o => o.lines).find(l => l.id === e.target.value); setOrderLineId(e.target.value); if (line) setProductId(line.productId);
      }}><option value="">Choisir la commande</option>{orders.flatMap(o => o.lines.filter(l => l.remainingQuantity > 0).map(l => <option key={l.id} value={l.id}>{l.productName} · {l.supplierName} · {l.expectedDeliveryDate ?? "date attendue inconnue"}</option>))}</select></label>}
      <label>Recette concernée<select required={kind === "substitution"} value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Sans recette précise</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label>Quantité concernée, facultative ({products.find(p => p.id === productId)?.unit ?? "portions"})<input type="number" min="0.001" max="1000000" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <label>Constat et conséquence observée<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <Button type="submit" disabled={busy || loading}>{busy ? "Enregistrement…" : "Enregistrer le signalement"}</Button>
    </form></details>
    <div className="sales-actions"><Link to="/orders">Revoir les achats et réceptions</Link><Link to="/stocks">Revoir les lots et pertes</Link><Link to="/recipes">Enregistrer une préparation</Link></div>
    {!loading && !incidents.some(i => i.serviceSlot === slot || i.serviceSlot === null) && <p>Aucun incident déclaré pour ce service.</p>}
    {incidents.filter(i => i.serviceSlot === slot || i.serviceSlot === null).map(incident => <article key={incident.id}>
      <h3>{labels[incident.kind]} · {incident.status === "open" ? "à traiter" : "suivi clos"}</h3><p>{incident.note}</p>
      <ul>{incident.consequences.map(c => <li key={c}>{c}</li>)}</ul>
      {incident.status === "open" ? <><h4>Ajustements à examiner</h4><ul>{incident.suggestions.map(s => <li key={s}>{s}</li>)}</ul>
        <ResolveIncident incident={incident} onChanged={() => setReload(n => n + 1)} /></> : <p>Réponse enregistrée : {incident.actionNote}</p>}
    </article>)}
  </section>;
}
