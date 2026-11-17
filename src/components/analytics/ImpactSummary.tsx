import { useEffect, useRef, useState } from "react";
import { consumeFocusRestoreRequest } from "../../utils/focusRestoration";
import { formatDisplayDate as displayDate, formatQuantity } from "../../utils/format";
import { Link, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { getImpactReport, type ImpactBucket, type ImpactPeriod, type ImpactReport } from "../../services/impactService";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import { receiptDetailsHref, stockMovementHref } from "../../utils/analyticsNavigation";

import BilanOverview from "./BilanOverview";
import MonthlyImpactPanel from "./MonthlyReconciliation";
import { comparisonValues, formatLossValue, formatMoney } from "./comparisonValues";

interface Props { from: string; to: string }

function periodRange(period: ImpactPeriod) {
  return `${displayDate(period.from)} – ${displayDate(period.to)} (${period.calendarDays} jours calendaires)`;
}

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

export function RecordedOperations({ bucket, currency, from, to, excludedLosses }: { bucket: ImpactBucket; currency: string; from: string; to: string; excludedLosses: number }) {
  const lossValue = !bucket.lossMovementCount && excludedLosses ? "Pertes exclues pour unité incompatible" : formatLossValue(bucket.lossMovementCount, bucket.unpricedLossMovementCount, bucket.knownLossCost, currency);
  return <>
    <details className="bilan-drilldown"><summary>Pertes par produit <span>{bucket.lossesByProduct.length} lignes · {lossValue}</span></summary>
    {bucket.lossesByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Pertes déclarées par produit" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité déclarée perdue</th><th>Coût connu</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.lossesByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.quantity)} {item.unit}</td>
          <td>{formatLossValue(item.movementCount, item.unpricedMovementCount, item.knownCost, currency)}{item.unpricedMovementCount ? ` · ${item.unpricedMovementCount} mouvement(s) sans prix historique` : ""}</td>
          <td><LossMovementReferences item={item} from={from} to={to} /></td>
        </tr>)}
      </tbody></table></div> : <p>{excludedLosses ? "Des mouvements de perte ont été écartés pour unité incompatible." : "Aucun mouvement de perte déclarée dans les données mesurables de cette période."}</p>}
    <p>Coût connu des pertes : <strong>{lossValue}</strong> · {bucket.unpricedLossMovementCount} mouvement(s) de perte sans valorisation historique.</p>
    </details>
    <details className="bilan-drilldown"><summary>Achats par produit <span>{bucket.receiptsByProduct.length} lignes · {bucket.receiptCount ? formatMoney(bucket.receivedCost, currency) : "Aucune réception enregistrée"}</span></summary>
    {bucket.receiptsByProduct.length ? <div className="sales-table-wrap" role="region" aria-label="Achats réellement réceptionnés par produit" aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Produit</th><th>Quantité reçue</th><th>Coût constaté</th><th>Traçabilité</th></tr></thead><tbody>
        {bucket.receiptsByProduct.map((item) => <tr key={`${item.productId}:${item.unit}`}>
          <td>{item.productName}</td><td>{formatQuantity(item.receivedQuantity)} {item.unit}</td>
          <td>{formatMoney(item.cost, currency)}</td><td><ReceiptReferences ids={item.receiptIds} from={from} to={to} /></td>
        </tr>)}
      </tbody></table></div> : <p>Aucune quantité réceptionnée enregistrée pour cette période.</p>}
    <p>Dépenses de produits réceptionnés : <strong>{bucket.receiptCount ? formatMoney(bucket.receivedCost, currency) : "Indisponible"}</strong> · {bucket.receiptCount} réception(s) confirmée(s).</p>
    </details>
  </>;
}

export default function ImpactSummary({ from, to }: Props) {
  const location = useLocation();
  const [refreshRevision, setRefreshRevision] = useState(0);
  const requestKey = JSON.stringify([from, to, refreshRevision]);
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
    if (loading || !consumeFocusRestoreRequest(retryFocusPending)) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading, report]);
  useEffect(() => {
    if (location.hash === "#impact-summary-title" && !loading) headingRef.current?.focus();
  }, [loading, location.hash]);
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
          <tr><th scope="row">Unités d’articles vendues (pas des couverts)</th><td>{comparisonValues(report.current, report.currency).sales}</td><td>{comparisonValues(report.prior, report.currency).sales}</td></tr>
          <tr><th scope="row">Coût connu des pertes déclarées</th><td>{comparisonValues(report.current, report.currency).losses}</td><td>{comparisonValues(report.prior, report.currency).losses}</td></tr>
          <tr><th scope="row">Achats réceptionnés (coût constaté)</th><td>{comparisonValues(report.current, report.currency).receipts}</td><td>{comparisonValues(report.prior, report.currency).receipts}</td></tr>
          <tr><th scope="row">Services ouverts complets enregistrés</th><td>{comparisonValues(report.current, report.currency).services}</td><td>{comparisonValues(report.prior, report.currency).services}</td></tr>
        </tbody></table></div>
      </details>
      {!report.current.hasRecordedData && <p role="status">Aucune donnée opérationnelle mesurable dans la période actuelle.</p>}
      {from.slice(0, 7) !== to.slice(0, 7) && <MonthlyImpactPanel key={`${from}:${to}`} from={from} to={to} />}
      <RecordedOperations bucket={report.current.recorded} currency={report.currency} from={from} to={to} excludedLosses={report.current.excluded.lossUnitMismatch} />
      <details className="impact-reading-guide"><summary>Comprendre les chiffres et leurs limites</summary>
      <p>La comparaison porte sur des périodes de même durée calendaire. Les ventes et les pertes déclarées par service suivent le jour du service (Europe/Paris). Les anciens mouvements de perte suivent leur date d’enregistrement (UTC). Les achats suivent leur date de livraison. Les unités restent séparées par produit.</p>
      <p className="impact-unmeasured"><strong>Non mesuré dans le système :</strong> ruptures de stock et inventaire complet des invendus. Seuls les invendus explicitement déclarés sont disponibles. Un seuil de stock bas ou une production ne prouvent pas une rupture ou un invendu. Les économies réalisées ne sont pas calculées.</p>
      {(report.current.excluded.lossUnitMismatch > 0 || report.current.excluded.receiptUnitMismatch > 0) &&
        <p>Éléments écartés pour unité incompatible : {report.current.excluded.lossUnitMismatch} mouvement(s) de perte et {report.current.excluded.receiptUnitMismatch} ligne(s) de réception.</p>}
      </details>
    </>}
  </section>;
}
