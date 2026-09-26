import "./StockLotsAndWaste.css";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../../config/api";
import { getProductions, type Production } from "../../services/recipeService";
import type { Product } from "../../types";
import Button from "../common/Button";
interface Lot { id: string; productId: string; receivedAt: string | null; expiresAt: string | null; remainingQuantity: number; unitCost: number | null; allocations: Array<{ stockMovementId: string; quantity: number }> }
interface Lots { lots: Lot[]; unagedStock: Array<{ productId: string; productName: string; quantity: number; unit: string }> }
interface Waste { id: string; kind: string; quantity: number; unit: string; serviceDate: string; serviceSlot: string | null; note: string; stockMovementId: string | null; cost: number | null }
const labels: Record<string, string> = { raw: "Matière brute", preparation: "Déchet de préparation", unsold: "Invendu", plate_return: "Retour d’assiette" };
export default function StockLotsAndWaste({ products, onSaved }: { products: Product[]; onSaved: () => Promise<void> }) {
  const [data, setData] = useState<Lots>({ lots: [], unagedStock: [] });
  const [waste, setWaste] = useState<Waste[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [error, setError] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("raw");
  const [productId, setProductId] = useState("");
  const [productionId, setProductionId] = useState("");
  const cooked = kind === "unsold" || kind === "plate_return";
  const linkedPreparation = kind === "preparation" && productionId !== "";
  const product = products.find((row) => row.id === productId);
  const load = async () => {
    const [lots, losses, prepared] = await Promise.all([apiRequest<Lots>("/workspace/stock-lots"), apiRequest<Waste[]>("/workspace/waste"), getProductions()]);
    setData(lots); setWaste(losses); setProductions(prepared.filter((row) => row.kind === "production"));
  };
  useEffect(() => { void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Chargement impossible.")); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      await apiRequest("/workspace/waste", { method: "POST", body: JSON.stringify({ operationId, kind,
        serviceDate: fields.get("date"), serviceSlot: fields.get("slot") || null, quantity: Number(fields.get("quantity")),
        avoidability: fields.get("avoidability"), unit: cooked ? "portion" : product?.unit,
        ...(cooked ? { productionId } : { productId, ...(linkedPreparation ? { productionId } : {}), ...(fields.get("lot") ? { lotId: fields.get("lot") } : {}) }), note: fields.get("note") || "" }) });
      setOperationId(crypto.randomUUID());
      await Promise.all([load(), onSaved()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Perte non enregistrée."); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby="lots-waste-title" className="stock-lots-waste">
    <h2 id="lots-waste-title">Lots et pertes</h2>
    <p>Les échéances renseignées les plus proches sont proposées en premier (FEFO). Un âge ou une échéance inconnue n’est pas estimé.</p>
    <ul>{data.lots.map((lot) => <li key={lot.id}>
      {products.find((row) => row.id === lot.productId)?.name ?? lot.productId} : {lot.remainingQuantity} {products.find((row) => row.id === lot.productId)?.unit} · reçu {lot.receivedAt ?? "date inconnue"} · échéance {lot.expiresAt ?? "inconnue"} · coût {lot.unitCost == null ? "inconnu" : `${lot.unitCost} € / unité`}
      {lot.allocations.length > 0 && <details><summary>Sorties tracées</summary><ul>{lot.allocations.map((entry) => <li key={entry.stockMovementId}>{entry.quantity} · mouvement {entry.stockMovementId}</li>)}</ul></details>}
    </li>)}</ul>
    {data.unagedStock.map((row) => <p key={row.productId}>{row.productName} : {row.quantity} {row.unit} de stock sans âge renseigné.</p>)}
    <form onSubmit={(event) => void submit(event)}>
      <h3>Déclarer une perte</h3>
      <label>Nature<select value={kind} onChange={(event) => { setKind(event.target.value); setProductionId(""); }}>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {kind !== "raw" && <label>Préparation liée<select required={kind !== "preparation"} value={productionId} onChange={(event) => setProductionId(event.target.value)}>
        <option value="">Matière avant production</option>{productions.map((row) => <option key={row.id} value={row.id}>{row.date.slice(0, 10)} · {row.recipeName} · {row.portions} portions</option>)}
      </select></label>}
      {!cooked && <><label>Produit<select required value={productId} onChange={(event) => setProductId(event.target.value)}>
        <option value="">Choisir</option>{products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>{!linkedPreparation && <label>Lot<select name="lot" key={productId}><option value="">Proposition FEFO</option>{data.lots.filter((row) => row.productId === productId && row.remainingQuantity > 0).map((row) => <option key={row.id} value={row.id}>{row.receivedAt ?? "Âge inconnu"} · échéance {row.expiresAt ?? "inconnue"} · {row.remainingQuantity}</option>)}</select></label>}</>}
      <label>Quantité ({cooked ? "portions" : product?.unit ?? "unité"})<input name="quantity" type="number" required min="0.001" max="1000000" step={!cooked && product?.unit === "pcs" ? "1" : "0.001"} /></label>
      <label>Date<input name="date" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} /></label>
      <label>Service<select name="slot"><option value="">Non ventilé</option><option value="lunch">Midi</option><option value="dinner">Soir</option></select></label>
      <label>Qualification<select name="avoidability"><option value="avoidable">Gaspillage évitable</option><option value="inedible">Déchet non comestible</option></select></label>
      <label>Note<input name="note" maxLength={1000} /></label>
      <p>{cooked || linkedPreparation ? "Les ingrédients ont déjà été déduits en production : aucune nouvelle sortie de matières." : "Cette déclaration déduit la matière du stock et trace les lots consommés."}</p>
      <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Confirmer la perte"}</Button>
    </form>
    {error && <p role="alert">{error}</p>}
    <h3>Déclarations récentes</h3>
    <ul>{waste.slice(0, 20).map((row) => <li key={row.id}>{row.serviceDate} · {row.serviceSlot === "lunch" ? "midi" : row.serviceSlot === "dinner" ? "soir" : "non ventilé"} · {labels[row.kind]} : {row.quantity} {row.unit} · {row.stockMovementId ? "matière déduite" : "sans nouvelle déduction"} · {row.cost == null ? "non valorisé" : `${row.cost.toFixed(2)} € (coût des lots)`} {row.note}</li>)}</ul>
  </section>;
}
