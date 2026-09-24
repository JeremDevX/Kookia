import { useEffect, useState } from "react";
import Button from "../common/Button";
import { getSalesBaseline, type SalesBaseline as Baseline } from "../../services/salesService";

const PAGE_SIZE = 50;

export default function SalesBaseline() {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  useEffect(() => {
    let active = true;
    void getSalesBaseline().then((result) => {
      if (active) setBaseline(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Réessayez.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="sales-panel" aria-labelledby="sales-baseline-title">
    <h2 id="sales-baseline-title">Estimation test des ventes</h2>
    <p>Cette estimation utilise les ventes manuelles, CSV et éventuellement simulées. Elle ne tient compte ni de la météo, ni des événements, ni du stock. Elle ne commande rien et n’est pas le moteur IA de prévision.</p>
    {loading ? <p role="status">Calcul de l'estimation test…</p> : error ?
      <p role="alert">Estimation test indisponible : {error}</p> : baseline && <>
        <p>Historique étudié : du {baseline.historyFrom} au {baseline.asOfDate}. Calendrier confirmé complet : {baseline.completeServiceDays}/{baseline.requiredConsecutiveDays} jours, dont {baseline.openServiceDays} services ouverts. Une ligne absente vaut zéro observé seulement pour un jour complet (ou fermé confirmé) ; une date non renseignée, partielle ou manquante reste inconnue. Estimation pour le {baseline.forecastDate}. Méthode : moyenne arrondie des {baseline.lookbackDays} derniers jours calendaires complets de ventes de chaque article. {baseline.provenance === "demo_simulation" ? "Ces résultats reposent sur des données simulées et ne mesurent pas l’activité réelle." : baseline.provenance === "mixed" ? "L’historique mélange données simulées et ventes enregistrées : ces résultats ne sont pas une mesure terrain." : ""}{baseline.excludedSimulationRows > 0 ? ` ${baseline.excludedSimulationRows} ligne(s) simulée(s) exclue(s) du calcul car des ventes enregistrées sont présentes.` : ""}</p>
        {baseline.status === "no_data" ? <p>Historique insuffisant : aucune vente enregistrée dans cette fenêtre. Aucune estimation affichée.</p> :
          baseline.status === "insufficient_history" ? <p>{baseline.mixedSourceWindow ? "Sources simulées et enregistrées mélangées : les simulations sont exclues, mais le calendrier ne distingue pas la complétude par source. Aucune estimation ni erreur de backtest n’est publiée." : `Historique insuffisant : les ${baseline.requiredConsecutiveDays} jours doivent être marqués complets (ouverts ou fermés confirmés). ${baseline.incompleteDates.length} date(s) restent inconnues ou partielles. Aucune estimation affichée ; ces jours ne sont jamais convertis en zéro vente.`}</p> : <>
            <p><strong>Résultats expérimentaux, non validés sur un jeu de données terrain indépendant.</strong> {baseline.items.length} article(s) sur {baseline.observedItemCount} disposent de l’historique requis ; {baseline.observedItemCount - baseline.items.length} article(s) observé(s) ne sont pas estimés faute de {baseline.requiredConsecutiveDays} jours complets. Une ligne absente sur ces journées complètes représente zéro vente observé. Chaque ligne a été évaluée sur les {baseline.evaluationDays} derniers jours, sans utiliser la vente du jour à prédire. L’erreur absolue moyenne (EAM) est exprimée en unités ; le pourcentage d’erreur absolue pondérée (WAPE) résume les erreurs sur ces mêmes jours. Ces mesures rétrospectives ne sont pas un score de confiance ni une garantie de fiabilité.</p>
            <div className="sales-table-wrap" role="region" aria-label="Baseline expérimentale par article" tabIndex={0}><table className="sales-table"><thead><tr>
              <th>Article vendu</th><th>Estimation pour le {baseline.forecastDate}</th><th>EAM sur {baseline.evaluationDays} jours</th><th>WAPE sur {baseline.evaluationDays} jours</th>
            </tr></thead><tbody>{baseline.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item) => <tr key={item.saleItemId}>
              <td>{item.saleItemName}</td><td>{item.forecastQuantity} unités</td><td>{item.backtest.meanAbsoluteError} unités</td>
              <td>{item.backtest.weightedAbsolutePercentageError === null ? "Non calculable" : `${item.backtest.weightedAbsolutePercentageError} %`}</td>
            </tr>)}</tbody></table></div>
            {baseline.items.length > PAGE_SIZE && <div className="sales-actions">
              <Button type="button" variant="outline" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Articles précédents</Button>
              <span role="status">Articles {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, baseline.items.length)} sur {baseline.items.length}</span>
              <Button type="button" variant="outline" disabled={(page + 1) * PAGE_SIZE >= baseline.items.length} onClick={() => setPage((current) => current + 1)}>Articles suivants</Button>
            </div>}
          </>}
      </>}
  </section>;
}
