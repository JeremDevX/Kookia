import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { Link } from "react-router-dom";
import { getSalesMetrics, type SalesMetrics as Metrics } from "../../services/salesService";
import { describeSalesMetricsSources, describeSalesMetricsTotalSource } from "../../features/sales/salesPresentation";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

interface Props { from: string; to: string }
const PAGE_SIZE = 50;
const MAX_PERIOD_SPAN_MS = 366 * 86_400_000;
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export default function SalesMetrics({ from, to }: Props) {
  const periodTooLong = Date.parse(to) - Date.parse(from) > MAX_PERIOD_SPAN_MS;
  const [refreshRevision, setRefreshRevision] = useState(0);
  const requestKey = `${from}:${to}:${refreshRevision}`;
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = !periodTooLong && loadedRequestKey !== requestKey;
  const [itemPage, setItemPage] = useState(0);
  const [dayPage, setDayPage] = useState(0);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  useEffect(() => {
    if (periodTooLong) return;
    let active = true;
    void getSalesMetrics(from, to).then((result) => {
      if (active) { setMetrics(result); setError(""); setItemPage(0); setDayPage(0); setLoadedRequestKey(requestKey); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Réessayez."); setLoadedRequestKey(requestKey); }
    });
    return () => { active = false; };
  }, [from, to, periodTooLong, requestKey]);
  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading, metrics]);
  const retryMetrics = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRefreshRevision((value) => value + 1);
  };

  return <section className="sales-panel sales-metrics" aria-labelledby="sales-metrics-title">
    <h2 ref={headingRef} id="sales-metrics-title" tabIndex={-1}>Indicateurs des ventes enregistrées</h2>
    {metrics && <p>{describeSalesMetricsSources(metrics.provenance)} Une ligne absente ne vaut zéro que si le calendrier du jour est complet ; les jours partiels, manquants ou non renseignés restent inconnus.</p>}
    {loading ? <p role="status">Calcul des indicateurs…</p> : periodTooLong ?
      <p role="status">Les indicateurs de ventes sont limités à une période d’environ un an. Raccourcissez les dates pour les consulter ; le rapport Impact reste disponible sur la période choisie.</p> : error ? <div role="alert"><p>Indicateurs indisponibles : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryMetrics}>Recharger les indicateurs</Button>
    </div> : metrics && <>
      <p>Période : du {displayDate(metrics.period.from)} au {displayDate(metrics.period.to)} · {metrics.observedDays} jour{metrics.observedDays > 1 ? "s" : ""} ouvert{metrics.observedDays > 1 ? "s" : ""} confirmé{metrics.observedDays > 1 ? "s" : ""} complet{metrics.observedDays > 1 ? "s" : ""} · {metrics.completeServiceDays} date(s) complètes au total · {metrics.incompleteServiceDays} date(s) manquante(s) ou partielles.</p>
      {metrics.status === "no_data" ? <p>Aucune vente enregistrée sur cette période. <Link to="/sales#sales-start">Ajouter des ventes</Link>.</p> : <>
        <p className="sales-metrics-total"><strong>{metrics.totalQuantity} unités dans l’historique ({describeSalesMetricsTotalSource(metrics.totalQuantity, metrics.demoSimulationQuantity)})</strong><br />{metrics.manualQuantity} en saisie manuelle · {metrics.csvQuantity} par import CSV{metrics.correctedCsvQuantity > 0 ? `, dont ${metrics.correctedCsvQuantity} corrigées` : ""} · {metrics.posQuantity} par caisse POS · {metrics.ticketZQuantity} par Ticket Z vérifié{metrics.demoSimulationQuantity > 0 ? ` · ${metrics.demoSimulationQuantity} unité(s) hors bilan` : ""}.</p>
        {metrics.status === "insufficient_history" ?
          <p role="status">Comparaison indisponible : {metrics.observedDays} services ouverts complets sur cette période et {metrics.previousObservedDays} sur la précédente. Il faut au moins {metrics.minimumObservedDays} jours complets ouverts dans chacune ; les jours fermés ne sont pas divisés comme jours de service.</p> :
          <p>Moyenne par service ouvert complet : {metrics.averagePerObservedDay} unités, contre {metrics.previousAveragePerObservedDay} sur la période précédente ({metrics.previousObservedDays} services ouverts complets). {metrics.changePercent === null ? "Évolution non calculable (moyenne précédente nulle)." : "Évolution : " + (metrics.changePercent > 0 ? "+" : "") + metrics.changePercent + " %."}</p>}
        <p id="sales-metrics-table-hint" className="sales-table-hint">Sur petit écran, faites défiler le tableau horizontalement. Au clavier, placez le focus sur la zone puis utilisez ← et →.</p>
        <h3>Par article vendu</h3>
        <div className="sales-table-wrap" role="region" aria-label="Ventes par article" aria-describedby="sales-metrics-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="sales-table"><thead><tr><th>Article vendu</th><th>Unités enregistrées</th></tr></thead><tbody>
          {metrics.items.slice(itemPage * PAGE_SIZE, (itemPage + 1) * PAGE_SIZE).map((item) =>
            <tr key={item.saleItemId}><td>{item.saleItemName}</td><td>{item.quantity}</td></tr>)}
        </tbody></table></div>
        {metrics.items.length > PAGE_SIZE && <div className="sales-actions">
          <Button type="button" variant="outline" disabled={itemPage === 0} onClick={() => setItemPage((page) => page - 1)}>Articles précédents</Button>
          <span role="status">Articles {itemPage * PAGE_SIZE + 1} à {Math.min((itemPage + 1) * PAGE_SIZE, metrics.items.length)} sur {metrics.items.length}</span>
          <Button type="button" variant="outline" disabled={(itemPage + 1) * PAGE_SIZE >= metrics.items.length} onClick={() => setItemPage((page) => page + 1)}>Articles suivants</Button>
        </div>}
        <h3>Par date de service et article</h3>
        <div className="sales-table-wrap" role="region" aria-label="Ventes par date et article" aria-describedby="sales-metrics-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="sales-table"><thead><tr><th>Date</th><th>Article vendu</th><th>Unités enregistrées</th></tr></thead><tbody>
          {metrics.dailyItems.slice(dayPage * PAGE_SIZE, (dayPage + 1) * PAGE_SIZE).map((row) =>
            <tr key={`${row.serviceDate}:${row.saleItemId}`}><td>{displayDate(row.serviceDate)}</td><td>{row.saleItemName}</td><td>{row.quantity}</td></tr>)}
        </tbody></table></div>
        {metrics.dailyItems.length > PAGE_SIZE && <div className="sales-actions">
          <Button type="button" variant="outline" disabled={dayPage === 0} onClick={() => setDayPage((page) => page - 1)}>Lignes précédentes</Button>
          <span role="status">Lignes {dayPage * PAGE_SIZE + 1} à {Math.min((dayPage + 1) * PAGE_SIZE, metrics.dailyItems.length)} sur {metrics.dailyItems.length}</span>
          <Button type="button" variant="outline" disabled={(dayPage + 1) * PAGE_SIZE >= metrics.dailyItems.length} onClick={() => setDayPage((page) => page + 1)}>Lignes suivantes</Button>
        </div>}
      </>}
    </>}
  </section>;
}
