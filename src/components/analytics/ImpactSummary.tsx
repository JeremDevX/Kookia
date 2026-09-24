import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { getImpactReport, type ImpactBucket, type ImpactPeriod, type ImpactReport } from "../../services/impactService";

interface Props { from: string; to: string }
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
const formatQuantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const formatMoney = (value: number, currency: string) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency, maximumFractionDigits: 2,
}).format(value);
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
    {bucket.lossesByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Pertes déclarées par produit" tabIndex={0}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité déclarée perdue</th><th>Coût connu</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.lossesByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.quantity)} {item.unit}</td>
          <td>{formatMoney(item.knownCost, currency)}{item.unpricedMovementCount ? ` · ${item.unpricedMovementCount} mouvement(s) sans prix snapshoté` : ""}</td>
          <td><OperationReferences ids={item.operationIds} label="Opérations source" /></td>
        </tr>)}
      </tbody></table></div> : <p>Aucun mouvement de perte déclarée dans les données mesurables de cette période.</p>}
    <p>Coût connu des pertes : <strong>{formatMoney(bucket.knownLossCost, currency)}</strong> · {bucket.unpricedLossMovementCount} mouvement(s) de perte sans valorisation historique.</p>
    <h3>Réceptions confirmées</h3>
    {bucket.receiptsByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Achats réellement réceptionnés par produit" tabIndex={0}>
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
  useEffect(() => {
    let active = true;
    void getImpactReport(from, to).then((result) => {
      if (active) { setReport(result); setError(""); setLoadedRequestKey(requestKey); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Réessayez."); setLoadedRequestKey(requestKey); }
    });
    return () => { active = false; };
  }, [from, to, requestKey]);
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
      <div className="sales-table-wrap" role="region" aria-label="Comparaison des périodes" tabIndex={0}>
        <table className="sales-table"><thead><tr><th>Indicateur observé</th><th>Période actuelle</th><th>Période précédente</th></tr></thead><tbody>
          <tr><th scope="row">Unités d’articles vendues (pas des couverts)</th><td>{recordedValue(report.current, report.current.recorded.menuItemUnits)}</td><td>{recordedValue(report.prior, report.prior.recorded.menuItemUnits)}</td></tr>
          <tr><th scope="row">Coût connu des pertes déclarées</th><td>{recordedValue(report.current, formatMoney(report.current.recorded.knownLossCost, report.currency))}</td><td>{recordedValue(report.prior, formatMoney(report.prior.recorded.knownLossCost, report.currency))}</td></tr>
          <tr><th scope="row">Achats réceptionnés (coût constaté)</th><td>{recordedValue(report.current, formatMoney(report.current.recorded.receivedCost, report.currency))}</td><td>{recordedValue(report.prior, formatMoney(report.prior.recorded.receivedCost, report.currency))}</td></tr>
          <tr><th scope="row">Services ouverts complets enregistrés</th><td>{recordedValue(report.current, report.current.recorded.serviceDays.complete)}</td><td>{recordedValue(report.prior, report.prior.recorded.serviceDays.complete)}</td></tr>
        </tbody></table></div>
      {!report.current.hasRecordedData && <p role="status">Aucune donnée opérationnelle mesurable dans la période actuelle.</p>}
      <RecordedOperations bucket={report.current.recorded} currency={report.currency} />
      <p className="impact-unmeasured"><strong>Non mesuré dans le système :</strong> ruptures de stock et quantités invendues. Un seuil de stock bas, une production ou une simulation ne sont pas assimilés à une rupture ou à un invendu. Les économies réalisées ne sont pas calculées.</p>
      {(report.current.excluded.simulatedSales > 0 || report.current.excluded.simulatedLosses > 0 || report.current.excluded.simulatedReceiptLines > 0) &&
        <p>Exclus des totaux enregistrés : {report.current.excluded.simulatedSales} ligne(s) de vente simulée(s), {report.current.excluded.simulatedLosses} mouvement(s) de perte simulé(s), {report.current.excluded.simulatedReceiptLines} ligne(s) de réception simulée(s). Unités incompatibles ignorées : {report.current.excluded.lossUnitMismatch + report.current.excluded.receiptUnitMismatch}.</p>}
      <SimulationOperations bucket={report.current.simulation} currency={report.currency} />
    </>}
  </section>;
}
