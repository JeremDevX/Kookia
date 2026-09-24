import { useEffect, useState } from "react";
import Button from "../common/Button";
import { Link } from "react-router-dom";
import { getSalesMetrics, type SalesMetrics as Metrics } from "../../services/salesService";

interface Props { from: string; to: string }
const PAGE_SIZE = 50;
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export default function SalesMetrics({ from, to }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemPage, setItemPage] = useState(0);
  const [dayPage, setDayPage] = useState(0);
  const sourceDescription = metrics?.provenance === "demo_simulation"
    ? "Ces données sont simulées pour la démonstration et ne sont pas des ventes observées."
    : metrics?.provenance === "mixed"
      ? "Les résultats mélangent ventes observées et données simulées ; ils ne représentent pas une mesure terrain."
      : "Les données de démonstration, le stock et les commandes sont exclus.";
  useEffect(() => {
    let active = true;
    void getSalesMetrics(from, to).then((result) => {
      if (active) setMetrics(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Réessayez.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  return <section className="sales-panel sales-metrics" aria-labelledby="sales-metrics-title">
    <h2 id="sales-metrics-title">Indicateurs des ventes enregistrées</h2>
    <p>Source : saisies manuelles, imports CSV, tickets de caisse vérifiés, lignes POS confirmées ou simulation du restaurant. {sourceDescription} Une ligne absente ne vaut zéro que si le calendrier du jour est complet ; les jours partiels, manquants ou non renseignés restent inconnus.</p>
    {loading ? <p role="status">Calcul des indicateurs…</p> : error ? <p role="alert">Indicateurs indisponibles : {error}</p> : metrics && <>
      <p>Période : du {displayDate(metrics.period.from)} au {displayDate(metrics.period.to)} · {metrics.observedDays} jour{metrics.observedDays > 1 ? "s" : ""} ouvert{metrics.observedDays > 1 ? "s" : ""} confirmé{metrics.observedDays > 1 ? "s" : ""} complet{metrics.observedDays > 1 ? "s" : ""} · {metrics.completeServiceDays} date(s) complètes au total · {metrics.incompleteServiceDays} date(s) manquante(s) ou partielles.</p>
      {metrics.status === "no_data" ? <p>Aucune vente enregistrée sur cette période. <Link to="/sales#sales-start">Ajouter des ventes</Link>.</p> : <>
        <p className="sales-metrics-total"><strong>{metrics.totalQuantity} unités vendues ({metrics.provenance === "demo_simulation" ? "simulées" : metrics.provenance === "mixed" ? "observées et simulées" : "enregistrées"})</strong><br />{metrics.manualQuantity} en saisie manuelle · {metrics.csvQuantity} par import CSV{metrics.correctedCsvQuantity > 0 ? `, dont ${metrics.correctedCsvQuantity} corrigées` : ""} · {metrics.posQuantity} par caisse POS · {metrics.ticketZQuantity} par Ticket Z vérifié · {metrics.demoSimulationQuantity} simulées.</p>
        {metrics.status === "insufficient_history" ?
          <p role="status">Comparaison indisponible : {metrics.observedDays} services ouverts complets sur cette période et {metrics.previousObservedDays} sur la précédente. Il faut au moins {metrics.minimumObservedDays} jours complets ouverts dans chacune ; les jours fermés ne sont pas divisés comme jours de service.</p> :
          <p>Moyenne par service ouvert complet : {metrics.averagePerObservedDay} unités, contre {metrics.previousAveragePerObservedDay} sur la période précédente ({metrics.previousObservedDays} services ouverts complets). {metrics.changePercent === null ? "Évolution non calculable (moyenne précédente nulle)." : "Évolution : " + (metrics.changePercent > 0 ? "+" : "") + metrics.changePercent + " %."}</p>}
        <h3>Par article vendu</h3>
        <div className="sales-table-wrap" role="region" aria-label="Ventes par article" tabIndex={0}><table className="sales-table"><thead><tr><th>Article vendu</th><th>Unités enregistrées</th></tr></thead><tbody>
          {metrics.items.slice(itemPage * PAGE_SIZE, (itemPage + 1) * PAGE_SIZE).map((item) =>
            <tr key={item.saleItemId}><td>{item.saleItemName}</td><td>{item.quantity}</td></tr>)}
        </tbody></table></div>
        {metrics.items.length > PAGE_SIZE && <div className="sales-actions">
          <Button type="button" variant="outline" disabled={itemPage === 0} onClick={() => setItemPage((page) => page - 1)}>Articles précédents</Button>
          <span role="status">Articles {itemPage * PAGE_SIZE + 1} à {Math.min((itemPage + 1) * PAGE_SIZE, metrics.items.length)} sur {metrics.items.length}</span>
          <Button type="button" variant="outline" disabled={(itemPage + 1) * PAGE_SIZE >= metrics.items.length} onClick={() => setItemPage((page) => page + 1)}>Articles suivants</Button>
        </div>}
        <h3>Par date de service et article</h3>
        <div className="sales-table-wrap" role="region" aria-label="Ventes par date et article" tabIndex={0}><table className="sales-table"><thead><tr><th>Date</th><th>Article vendu</th><th>Unités enregistrées</th></tr></thead><tbody>
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
