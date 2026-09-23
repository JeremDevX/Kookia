import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Button from "../components/common/Button";
import SalesImport from "../components/sales/SalesImport";
import SalesMetrics from "../components/sales/SalesMetrics";
import SalesBaseline from "../components/sales/SalesBaseline";
import { correctSale, createSale, createSaleItem, getLatestService, getSaleItems, getSales, type DailySale, type LatestService, type SaleItem, type SaleValues } from "../services/salesService";
import { describeServiceSources } from "../features/sales/salesPresentation";
import "../styles/Workspace.css";
import "./Sales.css";

const parisToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const initialFrom = () => new Date(Date.parse(parisToday()) - 29 * 86_400_000).toISOString().slice(0, 10);
const message = (error: unknown) => error instanceof Error ? error.message : "Réessayez.";

export default function Sales() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [sales, setSales] = useState<DailySale[]>([]);
  const [latestService, setLatestService] = useState<LatestService | null>(null);
  const [salesRevision, setSalesRevision] = useState(0);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(parisToday);
  const [values, setValues] = useState<SaleValues>({ saleItemId: "", serviceDate: parisToday(), quantity: 1 });
  const [itemName, setItemName] = useState("");
  const [itemSaving, setItemSaving] = useState(false);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [editing, setEditing] = useState<DailySale | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemError, setItemError] = useState("");
  const [itemStatus, setItemStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const productSelect = useRef<HTMLSelectElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const editOrigin = useRef<HTMLButtonElement>(null);
  const requestNumber = useRef(0);
  useEffect(() => { if (editing) productSelect.current?.focus(); }, [editing]);

  const load = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setLoading(true);
    setLoadError("");
    setSales([]);
    try {
      const [catalog, rows, latest] = await Promise.all([getSaleItems(), getSales(from, to), getLatestService()]);
      if (currentRequest === requestNumber.current) {
        setItems((current) => {
          const merged = new Map([...catalog, ...current].map((item) => [item.id, item]));
          return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
        });
        setSales(rows);
        setLatestService(latest);
      }
    } catch (cause) { if (currentRequest === requestNumber.current) setLoadError(message(cause)); }
    finally { if (currentRequest === requestNumber.current) setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const change = (next: SaleValues) => {
    setValues(next);
    if (!editing) setOperationId(crypto.randomUUID());
  };
  const cancel = (returnFocus = true) => {
    setEditing(null);
    setValues({ saleItemId: "", serviceDate: parisToday(), quantity: 1 });
    setOperationId(crypto.randomUUID());
    setError("");
    if (returnFocus) requestAnimationFrame(() => {
      if (editOrigin.current?.isConnected) editOrigin.current.focus();
      else productSelect.current?.focus();
    });
  };
  const addItem = async (event: FormEvent) => {
    event.preventDefault(); setItemSaving(true); setItemError(""); setItemStatus("");
    try {
      const item = await createSaleItem(itemName);
      setItems((current) => [...current, item].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      change({ ...values, saleItemId: item.id });
      setItemName(""); setItemStatus("Article vendu ajouté. Vous pouvez saisir sa première vente.");
      productSelect.current?.focus();
    } catch (cause) { setItemError(message(cause)); }
    finally { setItemSaving(false); }
  };
  const showImportedDate = async (date: string) => {
    setSalesRevision((current) => current + 1);
    if (date < from || date > to) { setFrom(date); setTo(date); }
    else await load();
    requestAnimationFrame(() => historyHeading.current?.focus());
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setStatus("");
    try {
      if (editing) await correctSale(editing.id, editing.revision, values);
      else await createSale(values, operationId);
      setStatus(editing ? "Vente corrigée et enregistrée." : "Vente enregistrée.");
      setSalesRevision((current) => current + 1);
      cancel(false);
      if (values.serviceDate < from || values.serviceDate > to) {
        setFrom(values.serviceDate);
        setTo(values.serviceDate);
      }
      else await load();
      requestAnimationFrame(() => historyHeading.current?.focus());
    } catch (cause) { setError(message(cause)); }
    finally { setSaving(false); }
  };

  return <div className="workspace-page sales-page">
    <header className="workspace-header"><div><h1>Ventes</h1>
      <p className="workspace-subtitle">Importez un CSV ou saisissez les ventes de votre dernier service.</p>
    </div></header>
    <section id="sales-start" className="sales-panel sales-start" aria-labelledby="sales-start-title">
      <h2 id="sales-start-title">Vos ventes enregistrées</h2>
      {loading ? <p role="status">Chargement des ventes…</p> : loadError ? <p role="alert">{loadError}</p> : latestService ?
        <p>Dernier service enregistré : {new Date(`${latestService.serviceDate}T12:00:00`).toLocaleDateString("fr-FR")} · source : {describeServiceSources(latestService.sources)}.</p> :
        <p>Aucune vente enregistrée. Une journée non saisie n'est pas comptée comme zéro vente.</p>}
      <div className="sales-actions"><a href="#sales-import-title">Importer un CSV Kookia</a><a href="#sales-entry-title">Saisir une vente</a></div>
      <small>Ces ventes alimentent les indicateurs, pas encore les achats suggérés.</small>
    </section>
    <SalesImport items={items} onImported={showImportedDate} onItemsCreated={setItems} />
    <section className="sales-panel" aria-labelledby="sale-item-title">
      <h2 id="sale-item-title">Articles vendus</h2>
      <p>Pour saisir une vente manuellement, créez d'abord le plat ou l'article vendu.</p>
      <form onSubmit={(event) => void addItem(event)} className="sales-form">
        <label>Nom du nouvel article<input required maxLength={120} value={itemName} onChange={(event) => setItemName(event.target.value)} /></label>
        <Button type="submit" disabled={itemSaving}>{itemSaving ? "Ajout…" : "Ajouter l’article"}</Button>
      </form>
      {itemError && <p role="alert">{itemError}</p>}
      {itemStatus && <p role="status">{itemStatus}</p>}
    </section>
    <section className="sales-panel" aria-labelledby="sales-entry-title">
      <h2 id="sales-entry-title">{editing ? "Corriger une vente" : "Saisir une vente"}</h2>
      <p>Provenance : saisie manuelle. Une correction se fait depuis l'historique ci-dessous.</p>
      <form onSubmit={(event) => void submit(event)} className="sales-form">
        <label>Article vendu<select ref={productSelect} required value={values.saleItemId} onChange={(event) => change({ ...values, saleItemId: event.target.value })}>
          <option value="">Choisir un article</option>
          {items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select></label>
        <label>Date de service<input type="date" required max={parisToday()} value={values.serviceDate} onChange={(event) => change({ ...values, serviceDate: event.target.value })} /></label>
        <label>Quantité vendue (unités)<input type="number" required min="1" max="1000000" step="1" value={values.quantity} onChange={(event) => change({ ...values, quantity: Number(event.target.value) })} /></label>
        <div className="sales-actions"><Button type="submit" disabled={saving || !items.length}>{saving ? "Enregistrement…" : editing ? "Enregistrer la correction" : "Valider la vente"}</Button>
          {editing && <Button type="button" variant="outline" onClick={() => cancel()}>Annuler</Button>}
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
    <section className="sales-panel" aria-labelledby="sales-history-title">
      <h2 id="sales-history-title" ref={historyHeading} tabIndex={-1}>Historique enregistré</h2>
      <div className="sales-filters"><label>Du<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Au<input type="date" value={to} min={from} max={parisToday()} onChange={(event) => setTo(event.target.value)} /></label>
        <Button type="button" variant="outline" onClick={() => { void load(); setSalesRevision((current) => current + 1); }}>Actualiser</Button></div>
      {loading ? <p role="status">Chargement des ventes…</p> : loadError ? <p role="alert">Historique indisponible : {loadError}</p> : sales.length === 0 ? <p>Aucune vente enregistrée sur cette période.</p> :
        <div className="sales-table-wrap" role="region" aria-label="Ventes par date et produit" tabIndex={0}><table className="sales-table"><thead><tr>
          <th>Date de service</th><th>Article vendu</th><th>Quantité</th><th>Provenance</th><th>Dernière modification</th><th>Action</th>
        </tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}>
          <td>{sale.serviceDate}</td><td>{sale.saleItemName}</td><td>{sale.quantity} unités</td>
          <td>{sale.source === "demo_simulation" ? "Simulation de démonstration" : sale.source === "manual" ? "Saisie manuelle" : sale.revision ? "Import CSV corrigé manuellement" : "Import CSV"}</td>
          <td>{new Date(sale.updatedAt).toLocaleString("fr-FR")}</td>
          <td><Button type="button" size="sm" variant="outline" onClick={(event) => { editOrigin.current = event.currentTarget; setEditing(sale); setValues({ saleItemId: sale.saleItemId, serviceDate: sale.serviceDate, quantity: sale.quantity }); setError(""); setStatus(""); document.getElementById("sales-entry-title")?.scrollIntoView(); }}>Corriger</Button></td>
        </tr>)}</tbody></table></div>}
    </section>
    <details className="sales-disclosure" onToggle={(event) => setShowMetrics(event.currentTarget.open)}><summary>Indicateurs des ventes</summary>
      {showMetrics && <SalesMetrics key={`${from}:${to}:${salesRevision}`} from={from} to={to} />}
    </details>
    <details className="sales-disclosure" onToggle={(event) => setShowBaseline(event.currentTarget.open)}><summary>Estimation test (non utilisée pour les achats)</summary>
      {showBaseline && <SalesBaseline key={salesRevision} />}
    </details>
  </div>;
}
