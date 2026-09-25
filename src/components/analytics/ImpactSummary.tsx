import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { getImpactReport, type ImpactBucket, type ImpactMonthlyPeriod, type ImpactPeriod, type ImpactReport } from "../../services/impactService";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

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
const hasActivity = (bucket: ImpactBucket) => bucket.menuItemUnits > 0 || bucket.lossMovementCount > 0 || bucket.receiptCount > 0;

function periodRange(period: ImpactPeriod) {
  return `${displayDate(period.from)} – ${displayDate(period.to)} (${period.calendarDays} jours calendaires)`;
}
const recordedValue = (period: ImpactPeriod, value: number | string) => period.hasRecordedData ? value : "Aucune donnée";

function OperationReferences({ ids, label }: { ids: string[]; label: string }) {
  if (!ids.length) return null;
  return <details><summary>{label} ({ids.length})</summary><ul>{ids.map((id) => <li key={id}><code>{id}</code></li>)}</ul></details>;
}

function RecordedOperations({ bucket, currency }: { bucket: ImpactBucket; currency: string }) {
  return <>
    <p>{bucket.menuItemUnits} unité(s) d’articles vendues · {bucket.serviceDays.complete} jour(s) complet(s), {bucket.serviceDays.partial} partiel(s), {bucket.serviceDays.coverageMissing} sans couverture déclarée, {bucket.serviceDays.closed} fermé(s), {bucket.serviceDays.unregistered} sans fiche de service.</p>
    <h3>Pertes déclarées</h3>
    {bucket.lossesByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Pertes déclarées par produit" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité déclarée perdue</th><th>Coût connu</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.lossesByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.quantity)} {item.unit}</td>
          <td>{formatMoney(item.knownCost, currency)}{item.unpricedMovementCount ? ` · ${item.unpricedMovementCount} mouvement(s) sans prix snapshoté` : ""}</td>
          <td><OperationReferences ids={item.operationIds} label="Opérations source" /></td>
        </tr>)}
      </tbody></table></div> : <p>Aucun mouvement de perte déclarée dans les données mesurables de cette période.</p>}
    <p>Coût connu des pertes : <strong>{formatMoney(bucket.knownLossCost, currency)}</strong> · {bucket.unpricedLossMovementCount} mouvement(s) de perte sans valorisation historique.</p>
    <h3>Réceptions confirmées</h3>
    {bucket.receiptsByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Achats réellement réceptionnés par produit" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité reçue</th><th>Coût constaté</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.receiptsByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.receivedQuantity)} {item.unit}</td>
          <td>{formatMoney(item.cost, currency)}</td><td><OperationReferences ids={item.receiptIds} label="Réceptions source" /></td>
        </tr>)}
      </tbody></table></div> : <p>Aucune quantité réceptionnée dans le ledger de commandes pour cette période.</p>}
    <p>Dépenses de produits réceptionnés : <strong>{formatMoney(bucket.receivedCost, currency)}</strong> · {bucket.receiptCount} réception(s) confirmée(s).</p>
  </>;
}

function SimulationOperations({ bucket, currency }: { bucket: ImpactBucket; currency: string }) {
  if (!hasActivity(bucket)) return null;
  return <details className="impact-simulation"><summary>Afficher les opérations de démonstration, séparées du bilan enregistré</summary>
    <p>Simulation : {bucket.menuItemUnits} unité(s) d’articles vendues · {bucket.lossMovementCount} mouvement(s) de perte · {formatMoney(bucket.knownLossCost, currency)} de coût de perte connu · {bucket.receiptCount} réception(s) simulée(s) ({formatMoney(bucket.receivedCost, currency)}).</p>
  </details>;
}

function monthlySales(period: ImpactMonthlyPeriod, simulation: boolean) {
  const bucket = simulation ? period.simulation : period.recorded;
  const label = simulation ? "Aucune vente simulée" : "Aucune vente enregistrée";
  if ((simulation && !period.hasSimulationData) || (!simulation && !period.hasRecordedData)) return label;
  if (bucket.menuItemUnits > 0) return `${formatQuantity(bucket.menuItemUnits)} unité(s) saisie(s)`;
  if (bucket.serviceDays.complete > 0) return `0 unité saisie · ${bucket.serviceDays.complete} service(s) complet(s)`;
  return "0 unité déclarée · aucun service complet pour confirmer un zéro";
}

function monthlyCoverage(bucket: ImpactMonthlyPeriod["recorded"]) {
  const days = bucket.serviceDays;
  return `${days.complete} service(s) complet(s) · ${days.partial} à compléter · ${days.coverageMissing} sans état renseigné · ${days.closed} fermé(s) · ${days.unregistered} sans fiche de service`;
}

function MonthlyReconciliation({ periods, currency }: { periods: ImpactMonthlyPeriod[]; currency: string }) {
  return <details className="impact-monthly-summary">
    <summary>Réconciliation mensuelle ({periods.length} mois)</summary>
    <p>Les périodes partielles reprennent uniquement les dates sélectionnées. Les ventes sont des unités d’articles ; un zéro n’est confirmé que par un service complet. Les pertes sont des mouvements déclarés, pas une quantité invendue ; simulations et unités incompatibles restent distinctes ou écartées.</p>
    <div className="sales-table-wrap" role="region" aria-label="Réconciliation mensuelle des indicateurs opérationnels"
      aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table impact-monthly-table" aria-label="Détails mensuels des ventes, services, pertes et réceptions"><thead><tr>
        <th scope="col">Mois et période</th><th scope="col">Ventes (unités)</th><th scope="col">Services renseignés</th>
        <th scope="col">Pertes déclarées</th><th scope="col">Réceptions confirmées</th>
      </tr></thead><tbody>{periods.map((period) => <tr key={period.month}>
        <th scope="row">{displayMonth(period.month)}<br /><small>{displayDate(period.from)} – {displayDate(period.to)} ({period.calendarDays} j)</small></th>
        <td><p><strong>Enregistré :</strong> {monthlySales(period, false)}</p><p><strong>Simulation :</strong> {monthlySales(period, true)}</p></td>
        <td><p><strong>Enregistré :</strong> {monthlyCoverage(period.recorded)}</p><p><strong>Simulation :</strong> {monthlyCoverage(period.simulation)}</p></td>
        <td><p><strong>Enregistré :</strong> {period.hasRecordedData ? `${period.recorded.lossMovementCount} mouvement(s) · ${formatMoney(period.recorded.knownLossCost, currency)} connu(s) · ${period.recorded.unpricedLossMovementCount} sans prix` : "Aucune donnée"}</p>
          <p><strong>Simulation :</strong> {period.hasSimulationData ? `${period.simulation.lossMovementCount} mouvement(s) · ${formatMoney(period.simulation.knownLossCost, currency)} connu(s) · ${period.simulation.unpricedLossMovementCount} sans prix` : "Aucune simulation"}</p>
          {period.excluded.lossUnitMismatch > 0 && <p>{period.excluded.lossUnitMismatch} mouvement(s) de perte écarté(s) pour unité incompatible</p>}
          {period.excluded.receiptUnitMismatch > 0 && <p>{period.excluded.receiptUnitMismatch} ligne(s) de réception écartée(s) pour unité incompatible</p>}</td>
        <td><p><strong>Enregistré :</strong> {period.hasRecordedData ? `${period.recorded.receiptCount} réception(s) · ${formatMoney(period.recorded.receivedCost, currency)}` : "Aucune donnée"}</p>
          <p><strong>Simulation :</strong> {period.hasSimulationData ? `${period.simulation.receiptCount} réception(s) · ${formatMoney(period.simulation.receivedCost, currency)}` : "Aucune simulation"}</p></td>
      </tr>)}</tbody></table>
    </div>
  </details>;
}

export default function ImpactSummary({ from, to }: Props) {
  const [refreshRevision, setRefreshRevision] = useState(0);
  const requestKey = `${from}:${to}:${refreshRevision}`;
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [error, setError] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  const selectedMonthCount = monthCount(from, to);
  const includeMonthly = selectedMonthCount >= 2 && selectedMonthCount <= 48;
  useEffect(() => {
    let active = true;
    void getImpactReport(from, to, includeMonthly).then((result) => {
      if (active) { setReport(result); setError(""); setLoadedRequestKey(requestKey); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Réessayez."); setLoadedRequestKey(requestKey); }
    });
    return () => { active = false; };
  }, [from, to, includeMonthly, requestKey]);
  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading, report]);
  const retryReport = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRefreshRevision((value) => value + 1);
  };

  return <section className="sales-panel impact-summary" aria-labelledby="impact-summary-title">
    <h2 ref={headingRef} id="impact-summary-title" tabIndex={-1}>Impact opérationnel mesuré</h2>
    <p>Comparaison de périodes de même durée calendaire. Les ventes suivent la date de service (Europe/Paris), les pertes leur date d’enregistrement (UTC) et les achats leur date de livraison. Les unités restent séparées par produit.</p>
    {loading ? <p role="status">Calcul de l’impact…</p> : error ? <div role="alert"><p>Bilan d’impact indisponible : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryReport}>Recharger le bilan</Button>
    </div> : report && <>
      <p>Période actuelle : {periodRange(report.current)} · précédente : {periodRange(report.prior)}.</p>
      <p id="impact-table-scroll-hint" className="sales-table-hint">Sur petit écran, faites défiler les tableaux horizontalement. Au clavier, placez le focus sur un tableau puis utilisez ← et →.</p>
      <div className="sales-table-wrap" role="region" aria-label="Comparaison des périodes" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="sales-table"><thead><tr><th>Indicateur observé</th><th>Période actuelle</th><th>Période précédente</th></tr></thead><tbody>
          <tr><th scope="row">Unités d’articles vendues (pas des couverts)</th><td>{recordedValue(report.current, report.current.recorded.menuItemUnits)}</td><td>{recordedValue(report.prior, report.prior.recorded.menuItemUnits)}</td></tr>
          <tr><th scope="row">Coût connu des pertes déclarées</th><td>{recordedValue(report.current, formatMoney(report.current.recorded.knownLossCost, report.currency))}</td><td>{recordedValue(report.prior, formatMoney(report.prior.recorded.knownLossCost, report.currency))}</td></tr>
          <tr><th scope="row">Achats réceptionnés (coût constaté)</th><td>{recordedValue(report.current, formatMoney(report.current.recorded.receivedCost, report.currency))}</td><td>{recordedValue(report.prior, formatMoney(report.prior.recorded.receivedCost, report.currency))}</td></tr>
          <tr><th scope="row">Services ouverts complets enregistrés</th><td>{recordedValue(report.current, report.current.recorded.serviceDays.complete)}</td><td>{recordedValue(report.prior, report.prior.recorded.serviceDays.complete)}</td></tr>
        </tbody></table></div>
      {!report.current.hasRecordedData && <p role="status">Aucune donnée opérationnelle mesurable dans la période actuelle.</p>}
      {report.monthly && <MonthlyReconciliation periods={report.monthly} currency={report.currency} />}
      {selectedMonthCount > 48 && <p role="status">La réconciliation mensuelle est disponible jusqu’à 48 mois calendaires. Réduisez la période pour l’afficher.</p>}
      <RecordedOperations bucket={report.current.recorded} currency={report.currency} />
      <p className="impact-unmeasured"><strong>Non mesuré dans le système :</strong> ruptures de stock et quantités invendues. Un seuil de stock bas, une production ou une simulation ne sont pas assimilés à une rupture ou à un invendu. Les économies réalisées ne sont pas calculées.</p>
      {(report.current.excluded.simulatedSales > 0 || report.current.excluded.simulatedLosses > 0 || report.current.excluded.simulatedReceiptLines > 0) &&
        <p>Exclus des totaux enregistrés : {report.current.excluded.simulatedSales} ligne(s) de vente simulée(s), {report.current.excluded.simulatedLosses} mouvement(s) de perte simulé(s), {report.current.excluded.simulatedReceiptLines} ligne(s) de réception simulée(s). Unités incompatibles ignorées : {report.current.excluded.lossUnitMismatch + report.current.excluded.receiptUnitMismatch}.</p>}
      <SimulationOperations bucket={report.current.simulation} currency={report.currency} />
    </>}
  </section>;
}
