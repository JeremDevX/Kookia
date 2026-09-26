import { Link } from "react-router-dom";
import type { ImpactReport } from "../../services/impactService";

export default function BilanOverview({ report }: { report: Pick<ImpactReport, "current" | "prior" | "currency"> }) {
  const current = report.current.recorded;
  const prior = report.prior.recorded;
  const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: report.currency }).format(value);
  const quantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
  const missingDays = current.serviceDays.partial + current.serviceDays.coverageMissing + current.serviceDays.unregistered;
  const losses = [...current.lossesByProduct].sort((a, b) => b.knownCost - a.knownCost).slice(0, 5);
  return <>
    <div className="bilan-kpis">
      <article><h3>Achats réceptionnés</h3><p className="bilan-kpi-value">{current.receiptCount ? money(current.receivedCost) : "—"}</p>
        <p>{current.receiptCount ? `${current.receiptCount} réceptions confirmées` : "Aucune réception enregistrée"}</p>
        <small>Période précédente : {prior.receiptCount ? money(prior.receivedCost) : "non renseignée"}</small>
      </article>
      <article><h3>Coût connu des pertes</h3><p className="bilan-kpi-value">{current.lossMovementCount ? money(current.knownLossCost) : "—"}</p>
        <p>{current.lossMovementCount ? `${current.lossMovementCount} pertes déclarées` : "Aucune perte déclarée"}</p>
        <small>{current.unpricedLossMovementCount ? `${current.unpricedLossMovementCount} pertes restent à valoriser` : "Uniquement les pertes enregistrées"}</small>
      </article>
      <article><h3>Articles vendus</h3><p className="bilan-kpi-value">{current.menuItemUnits || current.serviceDays.complete ? quantity(current.menuItemUnits) : "—"}</p>
        <p>Unités saisies, pas des couverts</p>
        <small>{missingDays ? "Historique de ventes incomplet" : "Calendrier de service renseigné"}</small>
      </article>
    </div>
    <section className="bilan-attention" aria-labelledby="bilan-attention-title">
      <h3 id="bilan-attention-title">Pour fiabiliser votre bilan</h3>
      <div className="bilan-action-rows">
        {missingDays > 0 && <div><div><strong>{missingDays} jours à compléter</strong><p>Renseignez les ventes ou confirmez les jours fermés. Une absence de saisie n’est pas une vente nulle.</p></div><Link to="/sales#sales-start">Compléter les ventes →</Link></div>}
        {current.unpricedLossMovementCount > 0 && <div><div><strong>{current.unpricedLossMovementCount} pertes sans coût connu</strong><p>Le montant affiché ne couvre pas toutes les pertes déclarées.</p></div><Link to="/stocks">Examiner les mouvements →</Link></div>}
        {current.receiptCount === 0 && <div><div><strong>Aucun achat réceptionné sur cette période</strong><p>Une facture seule ne confirme pas l’entrée des produits en stock.</p></div><Link to="/orders">Consulter les achats →</Link></div>}
        {!missingDays && !current.unpricedLossMovementCount && current.receiptCount > 0 && <p>Aucun complément détecté sur le calendrier de service et la valorisation des pertes.</p>}
      </div>
    </section>
    {losses.length > 0 && <section className="bilan-loss-priorities" aria-labelledby="bilan-loss-priorities-title">
      <h3 id="bilan-loss-priorities-title">Où se concentrent les pertes ?</h3>
      <p>Les 5 produits au coût de perte connu le plus élevé. Les quantités restent séparées par unité.</p>
      <ol>{losses.map((loss) => <li key={`${loss.productId}:${loss.unit}`}>
        <div><strong>{loss.productName}</strong><span>{quantity(loss.quantity)} {loss.unit} déclarés perdus{loss.unpricedMovementCount ? " · valorisation partielle" : ""}</span></div>
        <strong>{money(loss.knownCost)}</strong>
      </li>)}</ol>
    </section>}
  </>;
}
