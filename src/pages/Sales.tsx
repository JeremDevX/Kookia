import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import SalesImport from "../components/sales/SalesImport";
import SalesMetrics from "../components/sales/SalesMetrics";
import ServiceCalendar from "../components/sales/ServiceCalendar";
import DatedServices from "../components/sales/DatedServices";
import SaleServiceAllocation from "../components/sales/SaleServiceAllocation";
import SalesTicketImport, { type TicketPreview } from "../components/sales/SalesTicketImport";
import SalesReconciliation from "../components/sales/SalesReconciliation";
import SalesRecipeMappings from "../components/sales/SalesRecipeMappings";
import { correctSale, createSale, createSaleItem, recordSaleOutcome, type DailySale, type SaleValues } from "../services/salesService";
import { useSalesReads } from "../features/sales/useSalesReads";
import { describeServiceCoverage, describeServiceSources } from "../features/sales/salesPresentation";
import { formatLocalISODate, shiftDays } from "../utils/date";
import "../styles/Workspace.css";
import "./Sales.css";

const initialFrom = () => shiftDays(formatLocalISODate(), -29);
const message = (error: unknown) => error instanceof Error ? error.message : "Réessayez.";

export default function Sales() {
  const today = formatLocalISODate();
  const [salesRevision, setSalesRevision] = useState(0);
  const [ticketPreview, setTicketPreview] = useState<TicketPreview | null>(null);
  const [{ from, to }, setPeriod] = useState(() => ({ from: initialFrom(), to: today }));
  const { history, latest, catalog, items, rememberItems } = useSalesReads(from, to);
  const sales = history.data ?? [];
  const latestService = latest.data;
  const [values, setValues] = useState<SaleValues>({ saleItemId: "", serviceDate: today, quantity: 1 });
  const [itemName, setItemName] = useState("");
  const [itemSaving, setItemSaving] = useState(false);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [editing, setEditing] = useState<DailySale | null>(null);
  const [editReason, setEditReason] = useState("");
  const [correctionOperationId, setCorrectionOperationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemError, setItemError] = useState("");
  const [itemStatus, setItemStatus] = useState("");
  const [status, setStatus] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const productSelect = useRef<HTMLSelectElement>(null);
  const startHeading = useRef<HTMLHeadingElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const editOrigin = useRef<HTMLButtonElement>(null);
  const itemsHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (editing) productSelect.current?.focus(); }, [editing]);

  const includeDate = (date: string) => setPeriod((period) => date < period.from || date > period.to
    ? { from: date, to: date } : period);
  const refreshSales = (date?: string) => {
    setSalesRevision((current) => current + 1);
    latest.reload();
    history.reload();
    if (date) includeDate(date);
  };

  const change = (next: SaleValues) => {
    setValues(next);
    if (!editing) setOperationId(crypto.randomUUID());
  };
  const cancel = (returnFocus = true) => {
    setEditing(null);
    setEditReason("");
    setCorrectionOperationId(crypto.randomUUID());
    setValues({ saleItemId: "", serviceDate: formatLocalISODate(), quantity: 1 });
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
      rememberItems([item]);
      change({ ...values, saleItemId: item.id });
      setItemName(""); setItemStatus("Article vendu ajouté. Vous pouvez saisir sa première vente.");
      productSelect.current?.focus();
    } catch (cause) { setItemError(message(cause)); }
    finally { setItemSaving(false); }
  };
  const showImportedDate = async (date?: string) => {
    refreshSales(date);
    requestAnimationFrame(() => historyHeading.current?.focus());
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setStatus("");
    try {
      if (editing) await correctSale(editing.id, editing.revision, values, correctionOperationId, editReason);
      else await createSale(values, operationId);
      setStatus(editing ? "Vente corrigée et enregistrée." : "Vente enregistrée.");
      cancel(false);
      refreshSales(values.serviceDate);
      requestAnimationFrame(() => historyHeading.current?.focus());
    } catch (cause) {
      setError(message(cause));
      if (!editing) refreshSales();
    }
    finally { setSaving(false); }
  };

  return <div className="workspace-page sales-page">
    <header className="workspace-header"><div><h1>Ventes</h1>
      <p className="workspace-subtitle">Transcrivez un Ticket Z, importez un CSV ou saisissez vos ventes.</p>
    </div></header>
    <section id="sales-start" className="sales-panel sales-start" aria-labelledby="sales-start-title">
      <h2 id="sales-start-title" ref={startHeading} tabIndex={-1}>Vos ventes enregistrées</h2>
      {latest.loading ? <p role="status">Chargement du dernier service…</p> : latest.error ? <div role="alert"><p>Dernier service indisponible. {latest.error}</p>
        <Button type="button" variant="outline" onClick={() => {
          latest.reload(); startHeading.current?.focus();
        }}>Réessayer</Button></div> : latestService ?
        <p>Dernière date de service renseignée : {new Date(`${latestService.serviceDate}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} · {latestService.status === "open" ? "restaurant ouvert" : "restaurant fermé"} · couverture {describeServiceCoverage(latestService.coverage).toLocaleLowerCase("fr-FR")}.
          {latestService.status === "closed" ? " Aucune activité n’était prévue." : latestService.coverage === "complete" && latestService.salesCount === 0 ? " Zéro vente observé après revue complète." : latestService.coverage !== "complete" ? " " + latestService.salesCount + " ligne(s) enregistrée(s) ; les absences restent inconnues." : " " + latestService.salesCount + " ligne(s) enregistrée(s)."}
          {latestService.salesCount > 0 ? ` Sources : ${describeServiceSources(latestService.sources)}.` : ""}</p> :
        <p>Aucun jour de service renseigné. Une absence de donnée n'est ni un jour fermé ni zéro vente.</p>}
      <div className="sales-actions"><a href="#sales-import-title">Importer un CSV Kookia</a><a href="#sales-ticket-title">Transcrire un Ticket Z</a><a href="#sales-entry-title">Saisir une vente</a>
        <Link to="/predictions">Voir les prévisions</Link></div>
      <small>Les ventes alimentent les indicateurs et peuvent contribuer aux achats suggérés lorsque les services, cartes, recettes et stocks nécessaires sont renseignés.</small>
    </section>
    <DatedServices today={today} refreshToken={salesRevision} />
    <ServiceCalendar from={from} to={to} today={today} onChanged={async () => {
      setSalesRevision((current) => current + 1);
      latest.reload();
    }} />
    <SalesTicketImport onCandidatesSaved={async (serviceDate) => {
      setSalesRevision((current) => current + 1);
      includeDate(serviceDate);
    }} onPreviewChanged={setTicketPreview} />
    <SalesReconciliation from={from} to={to} refreshToken={salesRevision} items={items} ticketPreview={ticketPreview}
      onChanged={async () => refreshSales()} />
    <SalesImport items={items} onImported={showImportedDate} onItemsCreated={rememberItems} />
    <section className="sales-panel" aria-labelledby="sale-item-title">
      <h2 id="sale-item-title" ref={itemsHeading} tabIndex={-1}>Articles vendus</h2>
      {catalog.loading && <p role="status">Chargement des articles vendus…</p>}
      {catalog.error && <div role="alert"><p>Articles vendus indisponibles. {catalog.error}</p>
        <Button type="button" variant="outline" onClick={() => {
          catalog.reload(); itemsHeading.current?.focus();
        }}>Réessayer</Button></div>}
      <p>Pour saisir une vente manuellement, créez d'abord le plat ou l'article vendu.</p>
      <form onSubmit={(event) => void addItem(event)} className="sales-form">
        <label>Nom du nouvel article<input required maxLength={120} value={itemName} onChange={(event) => setItemName(event.target.value)} /></label>
        <Button type="submit" disabled={itemSaving}>{itemSaving ? "Ajout…" : "Ajouter l’article"}</Button>
      </form>
      {itemError && <p role="alert">{itemError}</p>}
      {itemStatus && <p role="status">{itemStatus}</p>}
    </section>
    <SalesRecipeMappings itemCount={items.length} />
    <section className="sales-panel" aria-labelledby="sales-entry-title">
      <h2 id="sales-entry-title">{editing ? "Corriger une vente" : "Saisir une vente"}</h2>
      <p>Provenance : saisie manuelle. Une correction se fait depuis l'historique ci-dessous.</p>
      <form onSubmit={(event) => void submit(event)} className="sales-form">
        <label>Article vendu<select ref={productSelect} required value={values.saleItemId} onChange={(event) => change({ ...values, saleItemId: event.target.value })}>
          <option value="">Choisir un article</option>
          {items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select></label>
        <label>Date de service<input type="date" required max={today} value={values.serviceDate} onChange={(event) => change({ ...values, serviceDate: event.target.value })} /></label>
        <label>Quantité vendue (unités)<input type="number" required min="1" max="1000000" step="1" value={values.quantity} onChange={(event) => change({ ...values, quantity: Number(event.target.value) })} /></label>
        {editing && <label>Motif de correction, sans donnée personnelle<textarea required maxLength={240} value={editReason} onChange={(event) => setEditReason(event.target.value)} /></label>}
        <div className="sales-actions"><Button type="submit" disabled={saving || !items.length}>{saving ? "Enregistrement…" : editing ? "Enregistrer la correction" : "Valider la vente"}</Button>
          {editing && <Button type="button" variant="outline" onClick={() => cancel()}>Annuler</Button>}
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
    <section className="sales-panel" aria-labelledby="sales-history-title">
      <h2 id="sales-history-title" ref={historyHeading} tabIndex={-1}>Historique enregistré</h2>
      <div className="sales-filters"><label>Du<input type="date" value={from} max={to} onChange={(event) => setPeriod({ from: event.target.value, to })} /></label>
        <label>Au<input type="date" value={to} min={from} max={today} onChange={(event) => setPeriod({ from, to: event.target.value })} /></label>
        <Button type="button" variant="outline" onClick={() => {
          history.reload();
          if (!history.error) setSalesRevision((current) => current + 1);
        }}>{history.error ? "Réessayer" : "Actualiser"}</Button></div>
      {history.loading ? <p role="status">Chargement des ventes…</p> : history.error ? <p role="alert">Historique indisponible. {history.error}</p> : sales.length === 0 ? <p>Aucune vente enregistrée sur cette période.</p> :
        <div className="sales-table-wrap" role="region" aria-label="Ventes par date et produit" tabIndex={0}><table className="sales-table"><thead><tr>
          <th>Date de service</th><th>Article vendu</th><th>Quantité</th><th>Provenance</th><th>Dernière modification</th><th>Action</th>
        </tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}>
          <td>{sale.serviceDate}</td><td>{sale.saleItemName}</td><td>{sale.quantity} unités</td>
          <td>{sale.source === "demo_simulation" ? "Hors bilan" : sale.source === "manual" ? "Saisie manuelle" : sale.source === "pos" ? sale.revision ? "Caisse POS corrigée" : "Caisse POS" : sale.source === "ticket_z" ? "Ticket Z vérifié" : sale.revision ? "Import CSV corrigé manuellement" : "Import CSV"}</td>
          <td>{new Date(sale.updatedAt).toLocaleString("fr-FR")}</td>
          <td><div className="sales-history-actions"><Button type="button" size="sm" variant="outline" onClick={(event) => { editOrigin.current = event.currentTarget; setEditing(sale); setCorrectionOperationId(crypto.randomUUID()); setValues({ saleItemId: sale.saleItemId, serviceDate: sale.serviceDate, quantity: sale.quantity }); setEditReason(""); setError(""); setStatus(""); document.getElementById("sales-entry-title")?.scrollIntoView(); }}>Corriger</Button>
            <SaleServiceAllocation sale={sale} onChanged={() => setSalesRevision((current) => current + 1)} />
            <SaleOutcomeActions sale={sale} onUpdated={async (action) => {
              setStatus(action === "void" ? "Vente annulée et conservée dans la provenance." : "Remboursement signalé ; les unités vendues restent inchangées.");
              refreshSales();
              requestAnimationFrame(() => historyHeading.current?.focus());
            }} /></div></td>
        </tr>)}</tbody></table></div>}
    </section>
    <details className="sales-disclosure" onToggle={(event) => setShowMetrics(event.currentTarget.open)}><summary>Indicateurs des ventes</summary>
      {showMetrics && <SalesMetrics key={`${from}:${to}:${salesRevision}`} from={from} to={to} />}
    </details>
  </div>;
}

function SaleOutcomeActions({ sale, onUpdated }: { sale: DailySale; onUpdated: (action: "void" | "refund") => Promise<void> }) {
  const [action, setAction] = useState<"void" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!action || !reason.trim()) return;
    setBusy(true); setError(""); setStatus("");
    try {
      await recordSaleOutcome(sale.id, sale.revision, action, reason.trim(), crypto.randomUUID());
      const savedAction = action;
      setStatus(savedAction === "void" ? "Vente annulée et conservée dans la provenance." : "Remboursement signalé ; les unités vendues restent inchangées.");
      setAction(null); setReason(""); await onUpdated(savedAction);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  return <details className="sales-outcome-actions"><summary>Annulation / remboursement</summary>
    {!action ? <><Button type="button" size="sm" variant="outline" onClick={() => { setAction("void"); setError(""); }}>Annuler une erreur</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => { setAction("refund"); setError(""); }}>Signaler un remboursement</Button></> :
      <form onSubmit={(event) => void submit(event)}>
        <p>{action === "void" ? "L’annulation retire la quantité erronée de la projection." : "Un remboursement monétaire ne modifie pas les unités vendues."}</p>
        <label>Motif, sans donnée personnelle<textarea required maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="sales-actions"><Button type="submit" size="sm" disabled={busy}>{busy ? "Enregistrement…" : "Confirmer"}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setAction(null); setReason(""); }}>Fermer</Button></div>
      </form>}
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
  </details>;
}
