import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { Link } from "react-router-dom";
import { getSalesMetrics, type SalesMetrics as Metrics } from "../../services/salesService";
import { describeSalesMetricsSources } from "../../features/sales/salesPresentation";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

import SalesOverview from "./SalesOverview";
import "../../pages/Analytics.css";

interface Props { from: string; to: string }
const PAGE_SIZE = 10;
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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("quantity");
  const matchingItems = (metrics?.items ?? []).filter((item) => item.saleItemName.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")))
    .sort((a, b) => sort === "name" ? a.saleItemName.localeCompare(b.saleItemName, "fr") : b.quantity - a.quantity);
  const matchingDays = (metrics?.dailyItems ?? []).filter((item) => item.saleItemName.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")))
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate) || a.saleItemName.localeCompare(b.saleItemName, "fr"));
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
    <h2 ref={headingRef} id="sales-metrics-title" tabIndex={-1}>Comprendre vos ventes</h2>
    {metrics && <details className="impact-reading-guide"><summary>Sources et qualité des ventes</summary><p>{describeSalesMetricsSources(metrics.provenance)} Une ligne absente ne vaut zéro que si le calendrier du jour est complet ; les jours partiels, manquants ou non renseignés restent inconnus.</p></details>}
    {loading ? <p role="status">Calcul des indicateurs…</p> : periodTooLong ?
      <p role="status">Les indicateurs de ventes sont limités à une période d’environ un an. Raccourcissez les dates pour les consulter ; le rapport Impact reste disponible sur la période choisie.</p> : error ? <div role="alert"><p>Indicateurs indisponibles : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryMetrics}>Recharger les indicateurs</Button>
    </div> : metrics && <>
      <SalesOverview metrics={metrics} />
      {metrics.status === "no_data" ? <div className="bilan-attention"><h3>Commencez par renseigner vos ventes</h3><p>Aucune vente disponible sur cette période. Les achats seuls ne permettent pas de mesurer les ventes.</p><Link to="/sales#sales-start">Ajouter des ventes →</Link></div> : <>
        <h3>Quels articles se vendent le plus ?</h3>
        <p>Classement en unités, pas en chiffre d’affaires. Le filtre s’applique aussi au détail journalier.</p>
        <div className="bilan-toolbar">
          <label>Rechercher un article<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setItemPage(0); setDayPage(0); }} placeholder="Nom de l’article" /></label>
          <label>Trier les articles<select value={sort} onChange={(event) => { setSort(event.target.value); setItemPage(0); }}><option value="quantity">Plus vendus d’abord</option><option value="name">Nom de l’article</option></select></label>
          <p role="status">{matchingItems.length} article(s)</p>
        </div>
        {!matchingItems.length && <p role="status">Aucun article ne correspond à votre recherche.</p>}
        <p id="sales-metrics-table-hint" className="sales-table-hint">Sur petit écran, faites défiler le tableau horizontalement. Au clavier, placez le focus sur la zone puis utilisez ← et →.</p>

        <div className="sales-table-wrap" role="region" aria-label="Ventes par article" aria-describedby="sales-metrics-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="sales-table"><thead><tr><th scope="col">Article vendu</th><th scope="col">Unités dans l’historique</th></tr></thead><tbody>
          {matchingItems.slice(itemPage * PAGE_SIZE, (itemPage + 1) * PAGE_SIZE).map((item) =>
            <tr key={item.saleItemId}><td>{item.saleItemName}</td><td>{item.quantity}</td></tr>)}
        </tbody></table></div>
        {matchingItems.length > PAGE_SIZE && <div className="sales-actions">
          <Button type="button" variant="outline" disabled={itemPage === 0} onClick={() => setItemPage((page) => page - 1)}>Articles précédents</Button>
          <span role="status">Articles {itemPage * PAGE_SIZE + 1} à {Math.min((itemPage + 1) * PAGE_SIZE, matchingItems.length)} sur {matchingItems.length}</span>
          <Button type="button" variant="outline" disabled={(itemPage + 1) * PAGE_SIZE >= matchingItems.length} onClick={() => setItemPage((page) => page + 1)}>Articles suivants</Button>
        </div>}
        <details className="bilan-drilldown"><summary>Détail par jour et article</summary>
        <div className="sales-table-wrap" role="region" aria-label="Ventes par date et article" aria-describedby="sales-metrics-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="sales-table"><thead><tr><th>Date</th><th scope="col">Article vendu</th><th scope="col">Unités dans l’historique</th></tr></thead><tbody>
          {matchingDays.slice(dayPage * PAGE_SIZE, (dayPage + 1) * PAGE_SIZE).map((row) =>
            <tr key={`${row.serviceDate}:${row.saleItemId}`}><td>{displayDate(row.serviceDate)}</td><td>{row.saleItemName}</td><td>{row.quantity}</td></tr>)}
        </tbody></table></div>
        {matchingDays.length > PAGE_SIZE && <div className="sales-actions">
          <Button type="button" variant="outline" disabled={dayPage === 0} onClick={() => setDayPage((page) => page - 1)}>Lignes précédentes</Button>
          <span role="status">Lignes {dayPage * PAGE_SIZE + 1} à {Math.min((dayPage + 1) * PAGE_SIZE, matchingDays.length)} sur {matchingDays.length}</span>
          <Button type="button" variant="outline" disabled={(dayPage + 1) * PAGE_SIZE >= matchingDays.length} onClick={() => setDayPage((page) => page + 1)}>Lignes suivantes</Button>
        </div>}
        </details>
      </>}
    </>}
  </section>;
}
