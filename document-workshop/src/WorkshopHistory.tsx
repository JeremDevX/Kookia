import { useEffect, useState } from "react";
import { History } from "lucide-react";
import type { WorkshopControl, WorkshopDayDetails } from "../../shared/workshopControl";
import { loadWorkshopDay, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate } from "./calendar";
import { dayHistoryHref, displayedTime, quantity, serviceLabel } from "./workshopPresentation";

function StockDetails({ stock }: { stock: WorkshopDayDetails["stock"] }) {
  return <details className="workshop-details">
    <summary>Soldes de stock · {stock.length}</summary>
    {stock.length ? <ul role="list" className="workshop-rows workshop-stock">
      {stock.map((row, index) => {
        const amount = (value: number | null) => value === null ? "Non renseigné" : `${quantity(value)} ${row.unit}`;
        return <li key={`${row.name}:${row.supplier}:${row.unit}:${index}`}>
          <strong>{row.name}{row.supplier && <small>{row.supplier}</small>}</strong>
          <dl className="workshop-facts">
            <div><dt>Ouverture</dt><dd>{amount(row.opening)}</dd></div>
            <div><dt>Reçu</dt><dd>{amount(row.received)}</dd></div>
            <div><dt>Consommé</dt><dd>{amount(row.consumed)}</dd></div>
            <div><dt>Perdu</dt><dd>{amount(row.lost)}</dd></div>
            <div><dt>Ajustement</dt><dd>{amount(row.adjustment)}</dd></div>
            <div><dt>Clôture</dt><dd>{amount(row.closing)}</dd></div>
          </dl>
        </li>;
      })}
    </ul> : <p className="hint">Aucun solde de stock disponible pour cette journée.</p>}
  </details>;
}

const incidentLabel = {
  normal: "Aucun imprévu",
  short_delivery: "Livraison incomplète",
  late_delivery: "Livraison retardée",
  unavailable: "Produit non livré",
  high_waste: "Lot frais altéré",
  refund: "Article servi remboursé",
  stock_gap: "Écart de comptage du stock",
  demand_shift: "Fréquentation inattendue",
} satisfies Record<NonNullable<WorkshopDayDetails["incident"]>, string>;

function DayDetails({ details }: { details: WorkshopDayDetails }) {
  const incident = details.incident && details.incident !== "normal" ? incidentLabel[details.incident] : null;
  return <div className="workshop-structured">
    {(incident || details.events.length > 0) && <div>
      {incident && <p><strong>Imprévu · </strong>{incident}</p>}
      {details.events.length > 0 && <ul>{details.events.map((event, index) => <li key={`${event}:${index}`}>{event}</li>)}</ul>}
    </div>}
    {details.services.length > 0 && <ul className="workshop-rows" role="list" aria-label="Services de la journée">
      {details.services.map(service => <li key={service.slot}><span><strong>{serviceLabel[service.slot]}</strong>{service.note && <small>{service.note}</small>}</span>
        <span>{service.covers === null ? "Couverts non renseignés" : `${quantity(service.covers)} couverts`}</span></li>)}
    </ul>}
    <details className="workshop-details">
      <summary>Ventes · {details.sales.length}</summary>
      {details.sales.length ? <ul className="workshop-rows" role="list">
        {details.sales.map(row => <li key={row.name}><span>{row.name}</span><strong>{quantity(row.quantity)} vendus</strong></li>)}
      </ul> : <p className="hint">Aucune vente disponible pour cette journée.</p>}
    </details>
    {details.sections.operations && <>
      <details className="workshop-details">
        <summary>Préparations · {details.preparations.length}</summary>
        {details.preparations.length ? <ul className="workshop-rows" role="list">
          {details.preparations.map((row, index) => <li key={`${row.slot}:${row.name}:${index}`}><span>{row.name}{row.slot && <small>{serviceLabel[row.slot]}</small>}</span>
            <span><strong>{quantity(row.prepared)} préparés</strong><small>{quantity(row.refused)} refusés</small></span></li>)}
        </ul> : <p className="hint">Aucune préparation disponible pour cette journée.</p>}
      </details>
      <details className="workshop-details">
        <summary>Pertes · {details.losses.length}</summary>
        {details.losses.length ? <ul className="workshop-rows" role="list">
          {details.losses.map((row, index) => <li key={`${row.name}:${index}`}><span>{row.name}<small>{row.reason}</small></span><strong>{quantity(row.quantity)} {row.unit}</strong></li>)}
        </ul> : <p className="hint">Aucune perte disponible pour cette journée.</p>}
      </details>
    </>}
    {details.sections.stock && <StockDetails stock={details.stock} />}
  </div>;
}

function LoadDay({ date, onAccessError }: { date: string; onAccessError: (cause: unknown) => void }) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<WorkshopDayDetails | "error" | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadWorkshopDay(date, controller.signal).then(details => {
      if (!controller.signal.aborted) setResult(details);
    }, (cause: unknown) => {
      if (controller.signal.aborted) return;
      const access = workshopAccessError(cause);
      if (access === "signin" || access === "reload") onAccessError(cause);
      setResult("error");
    });
    return () => controller.abort();
  }, [date, request, onAccessError]);

  if (!result) return <p role="status">Chargement de la journée…</p>;
  if (result === "error") return <div className="workshop-actions">
    <p role="alert" className="error">Le détail de la journée n’a pas pu être chargé.</p>
    <button type="button" className="secondary" onClick={() => { setResult(null); setRequest(value => value + 1); }}>Réessayer</button>
  </div>;
  return <DayDetails details={result} />;
}

function HistoryDay({ row, canManage, onAccessError }: {
  row: WorkshopControl["history"][number];
  canManage: boolean;
  onAccessError: (cause: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  return <details className="workshop-details" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><time dateTime={row.date}>{displayDate(row.date)}</time></summary>
    {open && <div className="workshop-structured">
      <p className="hint">Confirmé le {displayedTime(row.confirmedAt)} · {["Ventes", row.stock && "Stocks", row.operations && "Opérations"].filter(Boolean).join(" · ")}</p>
      <LoadDay date={row.date} onAccessError={onAccessError} />
      {(canManage || row.stock) && <div className="workshop-actions">
        {canManage && <a href={dayHistoryHref(row.date)} className="workshop-link">Voir la journée dans l’historique Kookia</a>}
        {row.stock && <a href="/stocks" className="workshop-link">Ouvrir les stocks</a>}
      </div>}
    </div>}
  </details>;
}

export default function WorkshopHistory({ history, canManage, onAccessError }: {
  history: WorkshopControl["history"];
  canManage: boolean;
  onAccessError: (cause: unknown) => void;
}) {
  return <section className="panel workshop-history" aria-labelledby="workshop-history">
    <div className="workshop-heading">
      <h2 id="workshop-history" className="section-heading"><span className="section-icon"><History size={18} aria-hidden="true" /></span>Historique des clôtures</h2>
      {canManage && <a href="/history" className="workshop-link">Ouvrir l’historique Kookia</a>}
    </div>
    {history.length ? history.map(row => <HistoryDay key={row.date} row={row} canManage={canManage} onAccessError={onAccessError} />)
      : <p className="hint">Aucune clôture confirmée par Kookia.</p>}
  </section>;
}
