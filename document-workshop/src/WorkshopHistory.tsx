import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Info, RotateCw } from "lucide-react";
import type { WorkshopControl, WorkshopDayDetails } from "../../shared/workshopControl";
import { loadWorkshopDay, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate } from "./calendar";
import { dayHistoryHref, displayedTime, quantity, serviceLabel } from "./workshopPresentation";

function StockDetails({ stock }: { stock: WorkshopDayDetails["stock"] }) {
  return <details className="workshop-details">
    <summary><span>Mouvements de stock</span><span className="control-detail-count">{stock.length} {stock.length === 1 ? "article" : "articles"}</span></summary>
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
            {row.adjustment !== 0 && <div><dt>Ajustement</dt><dd>{amount(row.adjustment)}</dd></div>}
            <div className="control-stock-closing"><dt>Clôture</dt><dd>{amount(row.closing)}</dd></div>
          </dl>
        </li>;
      })}
    </ul> : <p className="hint">Aucun mouvement de stock disponible.</p>}
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
  const soldCount = details.sales.reduce((sum, row) => sum + row.quantity, 0);
  const portionCount = details.preparations.reduce((sum, row) => sum + row.prepared, 0);
  return <div className="workshop-structured">
    {(incident || details.events.length > 0) && <div className="history-event control-empty">
      <Info size={20} aria-hidden="true" />
      <div>
        {incident && <p><strong>{incident}</strong></p>}
        {details.events.length > 0 && <ul>{details.events.map((event, index) => <li key={`${event}:${index}`}>{event}</li>)}</ul>}
      </div>
    </div>}
    {details.services.length > 0 && <ul className="workshop-rows" role="list" aria-label="Services de la journée">
      {details.services.map(service => <li key={service.slot}><span><strong>{serviceLabel[service.slot]}</strong>{service.note && <small>{service.note}</small>}</span>
        <span>{service.covers === null ? "Couverts non renseignés" : `${quantity(service.covers)} couverts`}</span></li>)}
    </ul>}
    {details.sections.sales && <details className="workshop-details">
      <summary><span>Ventes</span><span className="control-detail-count">{quantity(soldCount)} {soldCount === 1 ? "article" : "articles"}</span></summary>
      {details.sales.length ? <ul className="workshop-rows" role="list">
        {details.sales.map(row => <li key={row.name}><span>{row.name}</span><strong>{quantity(row.quantity)} vendus</strong></li>)}
      </ul> : <p className="hint">Aucune vente dans ce transfert.</p>}
    </details>}
    {details.sections.operations && <>
      <details className="workshop-details">
        <summary><span>Préparations</span><span className="control-detail-count">{quantity(portionCount)} {portionCount === 1 ? "portion" : "portions"}</span></summary>
        {details.preparations.length ? <ul className="workshop-rows" role="list">
          {details.preparations.map((row, index) => <li key={`${row.slot}:${row.name}:${index}`}><span>{row.name}{row.slot && <small>{serviceLabel[row.slot]}</small>}</span>
            <span><strong>{quantity(row.prepared)} portions</strong>{row.refused > 0 && <small>{quantity(row.refused)} refusées</small>}</span></li>)}
        </ul> : <p className="hint">Aucune préparation dans ce transfert.</p>}
      </details>
      <details className="workshop-details">
        <summary><span>Pertes</span><span className="control-detail-count">{details.losses.length} {details.losses.length === 1 ? "ligne" : "lignes"}</span></summary>
        {details.losses.length ? <ul className="workshop-rows" role="list">
          {details.losses.map((row, index) => <li key={`${row.name}:${index}`}><span>{row.name}<small>{row.reason}</small></span><strong>{quantity(row.quantity)} {row.unit}</strong></li>)}
        </ul> : <p className="hint">Aucune perte dans ce transfert.</p>}
      </details>
    </>}
    {details.sections.stock && <StockDetails stock={details.stock} />}
  </div>;
}

function LoadDay({ date, onAccessError }: { date: string; onAccessError: (cause: unknown) => void }) {
  const [request, setRequest] = useState(0);
  const content = useRef<HTMLDivElement>(null);
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

  const retry = () => {
    content.current?.focus();
    setResult(null);
    setRequest(value => value + 1);
  };
  return <div ref={content} tabIndex={-1}>
    {!result ? <p role="status" className="hint">Chargement de la journée…</p> : result === "error" ?
      <div className="workshop-actions control-day-failure">
        <p role="alert">Détail de la journée indisponible.</p>
        <button type="button" className="secondary" onClick={retry}><RotateCw size={16} aria-hidden="true" /> Réessayer</button>
      </div> : <DayDetails details={result} />}
  </div>;
}

function HistoryDay({ row, canManage, onAccessError }: {
  row: WorkshopControl["history"][number];
  canManage: boolean;
  onAccessError: (cause: unknown) => void;
}) {
  const [visited, setVisited] = useState(false);
  const contents = ["Ventes", row.operations && "Production et pertes", row.stock && "Stocks"].filter(Boolean).join(" · ");
  return <details className="workshop-details history-row" onToggle={event => { if (event.currentTarget.open) setVisited(true); }}>
    <summary>
      <span className="control-history-label"><time dateTime={row.date}>{displayDate(row.date)}</time><small>{contents}</small></span>
    </summary>
    {visited && <div className="history-content workshop-structured">
      <p className="hint control-history-receipt"><CalendarDays size={14} aria-hidden="true" /> Reçue le <time dateTime={row.confirmedAt}>{displayedTime(row.confirmedAt)}</time></p>
      <LoadDay date={row.date} onAccessError={onAccessError} />
      {(canManage || row.stock) && <div className="workshop-actions">
        {canManage && <a href={dayHistoryHref(row.date)} className="workshop-link">Ouvrir la journée dans Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>}
        {row.stock && <a href="/stocks" className="workshop-link">Stocks dans Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>}
      </div>}
    </div>}
  </details>;
}

const visibleClosures = 5;

export default function WorkshopHistory({ history, canManage, onAccessError }: {
  history: WorkshopControl["history"];
  canManage: boolean;
  onAccessError: (cause: unknown) => void;
}) {
  const earlier = history.slice(visibleClosures);
  return <section className="panel workshop-history" aria-labelledby="workshop-history">
    <div className="workshop-heading">
      <h2 id="workshop-history">Clôtures confirmées</h2>
      {canManage && <a href="/history" className="workshop-link">Historique Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>}
    </div>
    {history.length ? history.slice(0, visibleClosures).map(row => <HistoryDay key={row.date} row={row} canManage={canManage} onAccessError={onAccessError} />)
      : <p className="control-empty-copy">Les journées apparaîtront après le premier transfert réussi.</p>}
    {earlier.length > 0 && <details className="workshop-details history-more">
      <summary><span>Clôtures précédentes</span><span className="row-count">{earlier.length}</span></summary>
      {earlier.map(row => <HistoryDay key={row.date} row={row} canManage={canManage} onAccessError={onAccessError} />)}
    </details>}
  </section>;
}
