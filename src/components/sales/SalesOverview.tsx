import { Link } from "react-router-dom";
import type { SalesMetrics } from "../../services/salesService";
import { describeSalesMetricsTotalSource } from "../../features/sales/salesPresentation";

const quantity = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export default function SalesOverview({ metrics }: { metrics: SalesMetrics }) {
  const ready = metrics.status === "ready";
  return <>
    <div className="bilan-kpis">
      <article><h3>Articles dans l’historique</h3><p className="bilan-kpi-value">{metrics.status === "no_data" ? "—" : quantity(metrics.totalQuantity)}</p>
        <p>Unités {describeSalesMetricsTotalSource(metrics.totalQuantity, metrics.demoSimulationQuantity)}</p><small>Pas des couverts ni du chiffre d’affaires</small></article>
      <article><h3>Moyenne par service complet</h3><p className="bilan-kpi-value">{ready ? quantity(metrics.averagePerObservedDay) : "—"}</p>
        <p>{ready ? "unités par jour ouvert complet" : "Historique insuffisant pour comparer"}</p><small>{metrics.observedDays} services ouverts complets</small></article>
      <article><h3>Évolution de la moyenne</h3><p className="bilan-kpi-value">{ready && metrics.changePercent !== null ? `${metrics.changePercent > 0 ? "+" : ""}${quantity(metrics.changePercent)} %` : "—"}</p>
        <p>Par rapport à la période précédente</p><small>{date(metrics.previousPeriod.from)} – {date(metrics.previousPeriod.to)}</small></article>
    </div>
    {metrics.incompleteServiceDays > 0 && <section className="bilan-attention"><h3>{metrics.incompleteServiceDays} jours à compléter</h3>
      <div className="bilan-action-rows"><div><p>Ces jours restent inconnus, pas à zéro. Complétez les ventes et confirmez les jours fermés pour fiabiliser la lecture.</p><Link to="/sales#sales-start">Compléter les ventes →</Link></div></div>
    </section>}
    <details className="bilan-drilldown"><summary>Comprendre la comparaison et les sources</summary>
      <p>{metrics.completeServiceDays} dates complètes, dont {metrics.observedDays} services ouverts. La période précédente compte {metrics.previousObservedDays} services ouverts complets.</p>
      <p>La comparaison demande au moins {metrics.minimumObservedDays} services ouverts complets dans chaque période. Les jours fermés ne sont pas utilisés comme jours de service.</p>
      {ready && <p>Moyenne précédente : {quantity(metrics.previousAveragePerObservedDay)} unités. {metrics.changePercent === null && "Évolution non calculable : moyenne précédente nulle."}</p>}
      <p>{quantity(metrics.manualQuantity)} unités saisies manuellement · {quantity(metrics.csvQuantity)} importées par CSV, dont {quantity(metrics.correctedCsvQuantity)} corrigées · {quantity(metrics.posQuantity)} par caisse POS · {quantity(metrics.ticketZQuantity)} par Ticket Z vérifié.</p>
      {metrics.demoSimulationQuantity > 0 && <p>{quantity(metrics.demoSimulationQuantity)} unités hors bilan restent incluses dans le total de l’historique et les tableaux ; elles ne constituent pas des ventes enregistrées.</p>}
    </details>
  </>;
}
