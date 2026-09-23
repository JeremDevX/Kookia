import { useEffect, useState } from "react";
import Button from "../common/Button";
import { getSalesMetrics, type SalesMetrics as Metrics } from "../../services/salesService";

interface Props { from: string; to: string }
const PAGE_SIZE = 50;

export default function SalesMetrics({ from, to }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemPage, setItemPage] = useState(0);
  const [dayPage, setDayPage] = useState(0);
  useEffect(() => {
    let active = true;
    void getSalesMetrics(from, to).then((result) => {
      if (active) setMetrics(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Réessayez.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  return <section className="sales-panel" aria-labelledby="sales-metrics-title">
    <h2 id="sales-metrics-title">Indicateurs des ventes enregistrées</h2>
    <p>Source : saisies manuelles et imports CSV du restaurant, après corrections. Les données de démonstration, le stock et les commandes sont exclus. Une journée sans saisie n’est pas comptée comme zéro vente.</p>
    {loading ? <p role="status">Calcul des indicateurs…</p> : error ? <p role="alert">Indicateurs indisponibles : {error}</p> : metrics && <>
      <p>Période : du {metrics.period.from} au {metrics.period.to}. {metrics.observedDays} jour(s) avec ventes enregistrées.</p>
      {metrics.status === "no_data" ? <p>Historique insuffisant : aucune vente enregistrée sur cette période.</p> : <>
        <p><strong>{metrics.totalQuantity} unités vendues enregistrées</strong> : {metrics.manualQuantity} en saisie manuelle et {metrics.csvQuantity} par import CSV, dont {metrics.correctedCsvQuantity} unités sur des lignes CSV corrigées.</p>
        {metrics.status === "insufficient_history" ?
          <p role="status">Historique insuffisant pour comparer les périodes : au moins {metrics.minimumObservedDays} jours avec ventes enregistrées (7 minimum et au moins la moitié de la période) sont requis dans chacune. Période courante : {metrics.observedDays} ; précédente du {metrics.previousPeriod.from} au {metrics.previousPeriod.to} : {metrics.previousObservedDays}.</p> :
          <p>Moyenne par jour avec ventes enregistrées : {metrics.averagePerObservedDay} unités, contre {metrics.previousAveragePerObservedDay} du {metrics.previousPeriod.from} au {metrics.previousPeriod.to} ({metrics.previousObservedDays} jours observés). Évolution : {metrics.changePercent !== null && metrics.changePercent > 0 ? "+" : ""}{metrics.changePercent} %.</p>}
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
            <tr key={`${row.serviceDate}:${row.saleItemId}`}><td>{row.serviceDate}</td><td>{row.saleItemName}</td><td>{row.quantity}</td></tr>)}
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
