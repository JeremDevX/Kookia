import { useEffect, useRef, useState, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { getImpactReport, type ImpactBucket, type ImpactMonthlyPeriod, type ImpactPeriod, type ImpactReport } from "../../services/impactService";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import { receiptDetailsHref, stockMovementHref } from "../../utils/analyticsNavigation";

import BilanOverview from "./BilanOverview";

interface Props { from: string; to: string }
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
const formatQuantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const formatMoney = (value: number, currency: string) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency, maximumFractionDigits: 2,
}).format(value);
const monthCount = (from: string, to: string) => Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7)) -
  Number(from.slice(0, 4)) * 12 - Number(from.slice(5, 7)) + 1;
const displayMonth = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })
  .format(new Date(`${value}-01T00:00:00.000Z`));

function periodRange(period: ImpactPeriod) {
  return `${displayDate(period.from)} – ${displayDate(period.to)} (${period.calendarDays} jours calendaires)`;
}
const recordedValue = (period: ImpactPeriod, value: number | string) => period.hasRecordedData ? value : "Aucune donnée";

function LossMovementReferences({ item, from, to }: { item: ImpactBucket["lossesByProduct"][number]; from: string; to: string }) {
  if (!item.movementIds.length) return null;
  return <details><summary>Mouvements source ({item.movementIds.length})</summary><ul>{item.movementIds.map((id, index) => <li key={id}>
    <Link to={stockMovementHref(item.productId, id, from, to)}>Ouvrir le mouvement {index + 1}</Link>
  </li>)}</ul></details>;
}

function ReceiptReferences({ ids, from, to }: { ids: string[]; from: string; to: string }) {
  if (!ids.length) return null;
  return <details><summary>Réceptions source ({ids.length})</summary><ul>{ids.map((id, index) => <li key={id}>
    <Link to={receiptDetailsHref(id, from, to, "impact-summary-title")}>Ouvrir la réception source {index + 1}</Link>
  </li>)}</ul></details>;
}

function RecordedOperations({ bucket, currency, from, to }: { bucket: ImpactBucket; currency: string; from: string; to: string }) {
  return <>
    <details className="bilan-drilldown"><summary>Pertes par produit <span>{bucket.lossesByProduct.length} lignes · {formatMoney(bucket.knownLossCost, currency)}</span></summary>
    {bucket.lossesByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Pertes déclarées par produit" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité déclarée perdue</th><th>Coût connu</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.lossesByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.quantity)} {item.unit}</td>
          <td>{formatMoney(item.knownCost, currency)}{item.unpricedMovementCount ? ` · ${item.unpricedMovementCount} mouvement(s) sans prix historique` : ""}</td>
          <td><LossMovementReferences item={item} from={from} to={to} /></td>
        </tr>)}
      </tbody></table></div> : <p>Aucun mouvement de perte déclarée dans les données mesurables de cette période.</p>}
    <p>Coût connu des pertes : <strong>{formatMoney(bucket.knownLossCost, currency)}</strong> · {bucket.unpricedLossMovementCount} mouvement(s) de perte sans valorisation historique.</p>
    </details>
    <details className="bilan-drilldown"><summary>Achats par produit <span>{bucket.receiptsByProduct.length} lignes · {formatMoney(bucket.receivedCost, currency)}</span></summary>
    {bucket.receiptsByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Achats réellement réceptionnés par produit" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité reçue</th><th>Coût constaté</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.receiptsByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.receivedQuantity)} {item.unit}</td>
          <td>{formatMoney(item.cost, currency)}</td><td><ReceiptReferences ids={item.receiptIds} from={from} to={to} /></td>
        </tr>)}
      </tbody></table></div> : <p>Aucune quantité réceptionnée enregistrée pour cette période.</p>}
    <p>Dépenses de produits réceptionnés : <strong>{formatMoney(bucket.receivedCost, currency)}</strong> · {bucket.receiptCount} réception(s) confirmée(s).</p>
    </details>
  </>;
}

function monthlySales(period: ImpactMonthlyPeriod) {
  const bucket = period.recorded;
  if (!period.hasRecordedData) return "Aucune vente enregistrée";
  if (bucket.menuItemUnits > 0) return `${formatQuantity(bucket.menuItemUnits)} unité(s) saisie(s)`;
  if (bucket.serviceDays.complete > 0) return `0 unité saisie · ${bucket.serviceDays.complete} service(s) complet(s)`;
  return "0 unité déclarée · aucun service complet pour confirmer un zéro";
}

function monthlyCoverage(bucket: ImpactMonthlyPeriod["recorded"]) {
  const days = bucket.serviceDays;
  return `${days.complete} service(s) complet(s) · ${days.partial} à compléter · ${days.coverageMissing} sans état renseigné · ${days.closed} fermé(s) · ${days.unregistered} sans fiche de service`;
}

interface MonthlyReconciliationProps {
  periods: ImpactMonthlyPeriod[];
  currency: string;
  pagination: NonNullable<ImpactReport["monthlyPagination"]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOlder: () => void;
  onNewer: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

function MonthlyReconciliation({ periods, currency, pagination, open, onOpenChange, onOlder, onNewer, headingRef }: MonthlyReconciliationProps) {
  const displayedStart = periods[0]?.month ?? "";
  const displayedEnd = periods[periods.length - 1]?.month ?? "";
  return <details className="impact-monthly-summary bilan-drilldown" open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
    <summary>Évolution mois par mois · {pagination.totalMonths} mois</summary>
    <p>Les périodes partielles reprennent uniquement les dates sélectionnées. Les ventes sont des unités d’articles ; un zéro n’est confirmé que par un service complet. Les pertes sont des mouvements déclarés, pas une quantité invendue ; les unités incompatibles sont écartées.</p>
    <h3 ref={headingRef} tabIndex={-1}>Mois affichés : {displayMonth(displayedStart)} – {displayMonth(displayedEnd)}</h3>
    {pagination.pageCount > 1 && <nav className="impact-monthly-navigation" aria-label="Navigation des périodes mensuelles">
      <Button type="button" variant="outline" disabled={!pagination.hasOlder} onClick={onOlder}>Mois plus anciens</Button>
      <p aria-live="polite">Page {pagination.page + 1} sur {pagination.pageCount}</p>
      <Button type="button" variant="outline" disabled={!pagination.hasNewer} onClick={onNewer}>Mois plus récents</Button>
    </nav>}
    <div className="sales-table-wrap" role="region" aria-label="Réconciliation mensuelle des indicateurs opérationnels"
      aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table impact-monthly-table" aria-label="Détails mensuels des ventes, services, pertes et réceptions"><thead><tr>
        <th scope="col">Mois et période</th><th scope="col">Ventes (unités)</th><th scope="col">Services renseignés</th>
        <th scope="col">Pertes déclarées</th><th scope="col">Réceptions confirmées</th>
      </tr></thead><tbody>{periods.map((period) => <tr key={period.month}>
        <th scope="row">{displayMonth(period.month)}<br /><small>{displayDate(period.from)} – {displayDate(period.to)} ({period.calendarDays} j)</small></th>
        <td><p>{monthlySales(period)}</p></td>
        <td>{period.recorded.serviceDays.complete} complets<details><summary>Détail des services</summary><p>{monthlyCoverage(period.recorded)}</p></details></td>
        <td><p>{period.hasRecordedData ? `${period.recorded.lossMovementCount} mouvement(s) · ${formatMoney(period.recorded.knownLossCost, currency)} connu(s) · ${period.recorded.unpricedLossMovementCount} sans prix` : "Aucune donnée"}</p>
          {period.excluded.lossUnitMismatch > 0 && <p>{period.excluded.lossUnitMismatch} mouvement(s) de perte écarté(s) pour unité incompatible</p>}
          {period.excluded.receiptUnitMismatch > 0 && <p>{period.excluded.receiptUnitMismatch} ligne(s) de réception écartée(s) pour unité incompatible</p>}</td>
        <td><p>{period.hasRecordedData ? `${period.recorded.receiptCount} réception(s) · ${formatMoney(period.recorded.receivedCost, currency)}` : "Aucune donnée"}</p>
        </td>
      </tr>)}</tbody></table>
    </div>
  </details>;
}

export default function ImpactSummary({ from, to }: Props) {
  const location = useLocation();
  const selectedMonthCount = monthCount(from, to);
  const includeMonthly = selectedMonthCount >= 2;
  const [monthlyPage, setMonthlyPage] = useState(0);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const requestKey = JSON.stringify([from, to, includeMonthly ? monthlyPage : null, refreshRevision]);
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [error, setError] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const monthlyHeadingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  const monthlyPageFocusPending = useRef(false);
  useEffect(() => {
    let active = true;
    void getImpactReport(from, to, includeMonthly ? monthlyPage : undefined).then((result) => {
      if (active) { setReport(result); setError(""); setLoadedRequestKey(requestKey); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Réessayez."); setLoadedRequestKey(requestKey); }
    });
    return () => { active = false; };
  }, [from, to, includeMonthly, monthlyPage, requestKey]);
  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading, report]);
  useEffect(() => {
    if (location.hash === "#impact-summary-title" && !loading) headingRef.current?.focus();
  }, [loading, location.hash]);
  useEffect(() => {
    if (loading || !monthlyPageFocusPending.current) return;
    monthlyPageFocusPending.current = false;
    if (error) retryButtonRef.current?.focus();
    else monthlyHeadingRef.current?.focus();
  }, [error, loading, report]);
  const retryReport = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRefreshRevision((value) => value + 1);
  };

  return <section className="sales-panel impact-summary" aria-labelledby="impact-summary-title">
    <h2 ref={headingRef} id="impact-summary-title" tabIndex={-1}>Votre activité en un coup d’œil</h2>
    <p>Les opérations enregistrées sur la période. Les estimations sont consultables dans une vue séparée.</p>
    {loading ? <p role="status">Calcul de l’impact…</p> : error ? <div role="alert"><p>Bilan d’impact indisponible : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryReport}>Recharger le bilan</Button>
    </div> : report && <>
      <BilanOverview report={report} />
      <h3>Explorer les chiffres</h3>
      <p id="impact-table-scroll-hint" className="sales-table-hint">Sur petit écran, faites défiler les tableaux horizontalement. Au clavier, placez le focus sur un tableau puis utilisez ← et →.</p>
      <details className="bilan-drilldown"><summary>Comparer à la période précédente</summary>
      <p>Période actuelle : {periodRange(report.current)} · précédente : {periodRange(report.prior)}.</p>
      <div className="sales-table-wrap" role="region" aria-label="Comparaison des périodes" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="sales-table"><thead><tr><th>Indicateur observé</th><th>Période actuelle</th><th>Période précédente</th></tr></thead><tbody>
          <tr><th scope="row">Unités d’articles vendues (pas des couverts)</th><td>{recordedValue(report.current, report.current.recorded.menuItemUnits)}</td><td>{recordedValue(report.prior, report.prior.recorded.menuItemUnits)}</td></tr>
          <tr><th scope="row">Coût connu des pertes déclarées</th><td>{recordedValue(report.current, formatMoney(report.current.recorded.knownLossCost, report.currency))}</td><td>{recordedValue(report.prior, formatMoney(report.prior.recorded.knownLossCost, report.currency))}</td></tr>
          <tr><th scope="row">Achats réceptionnés (coût constaté)</th><td>{recordedValue(report.current, formatMoney(report.current.recorded.receivedCost, report.currency))}</td><td>{recordedValue(report.prior, formatMoney(report.prior.recorded.receivedCost, report.currency))}</td></tr>
          <tr><th scope="row">Services ouverts complets enregistrés</th><td>{recordedValue(report.current, report.current.recorded.serviceDays.complete)}</td><td>{recordedValue(report.prior, report.prior.recorded.serviceDays.complete)}</td></tr>
        </tbody></table></div>
      </details>
      {!report.current.hasRecordedData && <p role="status">Aucune donnée opérationnelle mesurable dans la période actuelle.</p>}
      {report.monthly && report.monthlyPagination && <MonthlyReconciliation periods={report.monthly} currency={report.currency}
        pagination={report.monthlyPagination} open={monthlyOpen} onOpenChange={setMonthlyOpen} headingRef={monthlyHeadingRef}
        onOlder={() => { monthlyPageFocusPending.current = true; setMonthlyPage((page) => page + 1); }}
        onNewer={() => { monthlyPageFocusPending.current = true; setMonthlyPage((page) => Math.max(0, page - 1)); }} />}
      <RecordedOperations bucket={report.current.recorded} currency={report.currency} from={from} to={to} />
      <details className="impact-reading-guide"><summary>Comprendre les chiffres et leurs limites</summary>
      <p>La comparaison porte sur des périodes de même durée calendaire, pas nécessairement de même activité. Les ventes suivent la date de service (Europe/Paris), les pertes leur date d’enregistrement (UTC) et les achats leur date de livraison. Les unités restent séparées par produit.</p>
      <p className="impact-unmeasured"><strong>Non mesuré dans le système :</strong> ruptures de stock et quantités invendues. Un seuil de stock bas ou une production ne prouvent pas une rupture ou un invendu. Les économies réalisées ne sont pas calculées.</p>
      {(report.current.excluded.lossUnitMismatch > 0 || report.current.excluded.receiptUnitMismatch > 0) &&
        <p>Éléments écartés pour unité incompatible : {report.current.excluded.lossUnitMismatch} mouvement(s) de perte et {report.current.excluded.receiptUnitMismatch} ligne(s) de réception.</p>}
      </details>
    </>}
  </section>;
}
