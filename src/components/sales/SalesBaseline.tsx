import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { getSalesBaseline, type SalesBaseline as Baseline } from "../../services/salesService";

const PAGE_SIZE = 50;

export default function SalesBaseline() {
  const [refreshRevision, setRefreshRevision] = useState(0);
  const requestKey = String(refreshRevision);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [error, setError] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const [page, setPage] = useState(0);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  useEffect(() => {
    let active = true;
    void getSalesBaseline().then((result) => {
      if (active) { setBaseline(result); setError(""); setPage(0); setLoadedRequestKey(requestKey); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Réessayez."); setLoadedRequestKey(requestKey); }
    });
    return () => { active = false; };
  }, [requestKey]);
  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [baseline, error, loading]);
  const retryBaseline = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRefreshRevision((value) => value + 1);
  };

  return <section className="sales-panel" aria-labelledby="sales-baseline-title">
    <h2 ref={headingRef} id="sales-baseline-title" tabIndex={-1}>Estimation test des ventes</h2>
    <p>Cette estimation utilise les ventes manuelles, CSV et éventuellement simulées. Elle ne tient compte ni de la météo, ni des événements, ni du stock. Les ingrédients restent une projection expérimentale, sans mouvement ni commande ; chaque vente est associée uniquement à la correspondance et à la version de recette datées pour son jour.</p>
    {loading ? <p role="status">Calcul de l'estimation test…</p> : error ?
      <div role="alert"><p>Estimation test indisponible : {error}</p>
        <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryBaseline}>Recharger l’estimation test</Button>
      </div> : baseline && <>
        <p>Historique étudié : du {baseline.historyFrom} au {baseline.asOfDate}. Calendrier confirmé complet : {baseline.completeServiceDays}/{baseline.requiredConsecutiveDays} jours, dont {baseline.openServiceDays} services ouverts. Une ligne absente vaut zéro observé seulement pour un jour complet (ou fermé confirmé) ; une date non renseignée, partielle ou manquante reste inconnue. Estimation pour le {baseline.forecastDate}. Méthode : moyenne arrondie des {baseline.lookbackDays} derniers jours calendaires complets de ventes de chaque article. {baseline.provenance === "demo_simulation" ? "Ces résultats reposent sur des données simulées et ne mesurent pas l’activité réelle." : baseline.provenance === "mixed" ? "L’historique mélange données simulées et ventes enregistrées : ces résultats ne sont pas une mesure terrain." : ""}{baseline.excludedSimulationRows > 0 ? ` ${baseline.excludedSimulationRows} ligne(s) simulée(s) exclue(s) du calcul car des ventes enregistrées sont présentes.` : ""}</p>
        {baseline.status === "no_data" ? <p>Historique insuffisant : aucune vente enregistrée dans cette fenêtre. Aucune estimation affichée.</p> :
          baseline.status === "insufficient_history" ? <p>{baseline.mixedSourceWindow ? "Sources simulées et enregistrées mélangées : les simulations sont exclues, mais le calendrier ne distingue pas la complétude par source. Aucune estimation ni erreur de backtest n’est publiée." : `Historique insuffisant : les ${baseline.requiredConsecutiveDays} jours doivent être marqués complets (ouverts ou fermés confirmés). ${baseline.incompleteDates.length} date(s) restent inconnues ou partielles. Aucune estimation affichée ; ces jours ne sont jamais convertis en zéro vente.`}</p> : <>
            <p><strong>Résultats expérimentaux, non validés sur un jeu de données terrain indépendant.</strong> {baseline.items.length} article(s) sur {baseline.observedItemCount} disposent de l’historique requis ; {baseline.observedItemCount - baseline.items.length} article(s) observé(s) ne sont pas estimés faute de {baseline.requiredConsecutiveDays} jours complets. Une ligne absente sur ces journées complètes représente zéro vente observé. Les deux méthodes sont comparées sur les mêmes {baseline.evaluationDays} dates, sans utiliser la vente du jour à prédire : moyenne des sept jours précédents et vente du même jour de semaine précédent (J−7). L’estimation affichée pour demain reste la moyenne mobile ; aucun gagnant n’est sélectionné automatiquement. EAM en unités et WAPE résument les erreurs rétrospectives : ce ne sont ni un score de confiance ni une garantie de fiabilité.</p>
            <div className="sales-table-wrap" role="region" aria-label="Baseline expérimentale par article" tabIndex={0}><table className="sales-table"><thead><tr>
              <th>Article vendu</th><th>Estimation pour le {baseline.forecastDate}</th>
              <th>Volume observé · {baseline.evaluationDays} j</th><th>EAM · moyenne 7 j</th><th>EAM · même jour J−7</th>
              <th>WAPE · moyenne 7 j</th><th>WAPE · même jour J−7</th><th>Projection recette datée</th>
            </tr></thead><tbody>{baseline.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item) => <tr key={item.saleItemId}>
              <td>{item.saleItemName}</td><td>{item.forecastQuantity} unités</td>
              <td>{item.backtest.observedQuantity} unités</td>
              <td>{item.backtest.rollingMean7.meanAbsoluteError} unités</td>
              <td>{item.backtest.previousWeekday.meanAbsoluteError} unités</td>
              <td>{item.backtest.rollingMean7.weightedAbsolutePercentageError === null ? "Non calculable" : `${item.backtest.rollingMean7.weightedAbsolutePercentageError} %`}</td>
              <td>{item.backtest.previousWeekday.weightedAbsolutePercentageError === null ? "Non calculable" : `${item.backtest.previousWeekday.weightedAbsolutePercentageError} %`}</td>
              <td>{item.recipeProjection.status === "unmapped" ? item.recipeProjection.reason :
                item.recipeProjection.status === "recipe_version_unknown" ? item.recipeProjection.reason : <details>
                  <summary>{item.recipeProjection.recipeName} v{item.recipeProjection.recipeVersion} · {item.recipeProjection.forecastPortions} portions</summary>
                  <p>Correspondance {item.recipeProjection.mappingRevision} depuis le {item.recipeProjection.mappingEffectiveFrom} · recette v{item.recipeProjection.recipeVersion} effective le {item.recipeProjection.recipeEffectiveFrom} · {item.recipeProjection.portionsPerItem} portion(s) par article vendu.</p>
                  <ul>{item.recipeProjection.ingredients.map((ingredient) => <li key={ingredient.productId}>
                    {ingredient.productName} : {ingredient.quantity} {ingredient.unit}
                  </li>)}</ul>
                  <p>Backtest matière : {item.recipeBacktest.mappedDays}/{item.recipeBacktest.days} jours avec correspondance et recette datées ; {item.recipeBacktest.missingMappingDays} sans correspondance, {item.recipeBacktest.missingDatedRecipeDays} sans version datée. La recette est résolue séparément à la date cible, jamais depuis sa version actuelle si elle est future.</p>
                  {item.recipeBacktest.versionsUsed.length > 0 && <ul>{item.recipeBacktest.versionsUsed.map((usage) =>
                    <li key={usage.serviceDate}>{usage.serviceDate} : {usage.recipeName} v{usage.recipeVersion} (effet {usage.recipeEffectiveFrom}), correspondance {usage.mappingRevision}</li>)}</ul>}
                  {item.recipeBacktest.ingredients.length > 0 && <ul>{item.recipeBacktest.ingredients.map((ingredient) => <li key={ingredient.productId}>
                    Erreur matière {ingredient.productName} : {ingredient.meanAbsoluteError} {ingredient.unit}/jour · WAPE {ingredient.weightedAbsolutePercentageError === null ? "non calculable" : `${ingredient.weightedAbsolutePercentageError} %`}
                  </li>)}</ul>}
                </details>}</td>
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
