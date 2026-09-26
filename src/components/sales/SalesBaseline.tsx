import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getSalesBaseline, type SalesBaseline as Baseline } from "../../services/salesService";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

const PAGE_SIZE = 50;
type BaselineItem = Baseline["items"][number];
const formatQuantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
const contextSourceLabel = (status: Baseline["contextualForecast"]["weather"]) =>
  status === "not_connected" ? "sans connexion" : status === "unavailable" ? "indisponible"
    : status === "stale" ? "périmée" : "à jour";

function RecipeProjectionDetails({ item }: { item: BaselineItem }) {
  const projection = item.recipeProjection;
  if (projection.status !== "mapped") return <span>{projection.reason}</span>;
  return <details>
    <summary>{projection.recipeName} v{projection.recipeVersion} · {formatQuantity(projection.forecastPortions)} portions</summary>
    <p>Correspondance {projection.mappingRevision} depuis le {projection.mappingEffectiveFrom} · recette v{projection.recipeVersion} effective le {projection.recipeEffectiveFrom} · {formatQuantity(projection.portionsPerItem)} portion(s) par article vendu.</p>
    <ul>{projection.ingredients.map((ingredient) => <li key={ingredient.productId}>
      {ingredient.productName} : {formatQuantity(ingredient.quantity)} {ingredient.unit}
    </li>)}</ul>
    <p>Backtest matière : {item.recipeBacktest.mappedDays}/{item.recipeBacktest.days} jours avec correspondance et recette datées ; {item.recipeBacktest.missingMappingDays} sans correspondance, {item.recipeBacktest.missingDatedRecipeDays} sans version datée. La recette est résolue séparément à la date cible, jamais depuis sa version actuelle si elle est future.</p>
    {item.recipeBacktest.versionsUsed.length > 0 && <ul>{item.recipeBacktest.versionsUsed.map((usage) =>
      <li key={usage.serviceDate}>{usage.serviceDate} : {usage.recipeName} v{usage.recipeVersion} (effet {usage.recipeEffectiveFrom}), correspondance {usage.mappingRevision}</li>)}</ul>}
    {item.recipeBacktest.ingredients.length > 0 && <ul>{item.recipeBacktest.ingredients.map((ingredient) =>
      <li key={ingredient.productId}>Erreur matière {ingredient.productName} : {formatQuantity(ingredient.meanAbsoluteError)} {ingredient.unit}/jour · WAPE {ingredient.weightedAbsolutePercentageError === null ? "non calculable" : `${formatQuantity(ingredient.weightedAbsolutePercentageError)} %`}</li>)}</ul>}
  </details>;
}

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
    <h2 ref={headingRef} id="sales-baseline-title" tabIndex={-1}>Prévision des ventes</h2>
    <p className="sales-baseline-intro">Cette prévision porte sur les ventes enregistrées. Les réceptions servent aux sorties estimées par recette ci-dessus ; elles ne remplacent pas l’historique de ventes.</p>
    {loading ? <p role="status">Calcul de la prévision…</p> : error ?
      <div role="alert"><p>Prévision indisponible : {error}</p>
        <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryBaseline}>Recharger la prévision</Button>
      </div> : baseline && <>
        <dl className="sales-baseline-summary">
          <div><dt>Période étudiée</dt><dd>{displayDate(baseline.historyFrom)} – {displayDate(baseline.asOfDate)}</dd></div>
          <div><dt>Services complets</dt><dd>{baseline.completeServiceDays} / {baseline.requiredConsecutiveDays} · {baseline.openServiceDays} ouverts</dd></div>
          <div><dt>Prévision visée</dt><dd>{displayDate(baseline.forecastDate)}</dd></div>
        </dl>
        {baseline.provenance === "mixed" && <p className="sales-baseline-note">Certaines lignes ne sont pas retenues parmi les ventes enregistrées et ne complètent pas le calendrier de service.</p>}
        {baseline.excludedSimulationRows > 0 && <p className="sales-baseline-note">{baseline.excludedSimulationRows} ligne(s) ne sont pas retenues dans le calcul des ventes.</p>}
        <details className="sales-baseline-method">
          <summary>Méthode et contexte</summary>
          <p>Moyenne des {baseline.lookbackDays} derniers jours calendaires complets par article. Les dates inconnues ou partielles restent exclues ; une absence de vente vaut zéro uniquement pour un service complet.</p>
          <p>La météo, les événements et le stock ne sont pas intégrés. Position : non confirmée ; météo : {contextSourceLabel(baseline.contextualForecast.weather)} ; événements : {contextSourceLabel(baseline.contextualForecast.events)} ; données historiques : {contextSourceLabel(baseline.contextualForecast.historicalEmissions)}. Aucun ajustement contextuel n’est appliqué.</p>
          <p>Les ingrédients ne sont projetés qu’avec une correspondance confirmée et une version de recette datée. Cette prévision ne crée aucune vente, production, perte, sortie de stock ou commande.</p>
        </details>
        {baseline.status === "no_data" ? <div className="sales-baseline-guidance" role="status">
          <h3>Aucune vente enregistrée dans cette période</h3>
          <p>Les entrées réceptionnées sont présentées séparément en sorties estimées ; elles ne constituent pas des ventes par article.</p>
          <Link to="/sales#sales-start">Ajouter ou importer des ventes</Link>
        </div> :
          baseline.status === "insufficient_history" ? <div className="sales-baseline-guidance" role="status">
            <h3>Historique de ventes incomplet</h3>
            <p>{baseline.completeServiceDays} jour(s) complet(s) sur {baseline.requiredConsecutiveDays} requis ; {baseline.incompleteDates.length} date(s) restent inconnues ou partielles. Aucune prévision n’est affichée et ces jours ne sont pas assimilés à zéro vente.</p>
            {baseline.mixedSourceWindow && <p>Les lignes et le calendrier ne permettent pas de confirmer une couverture complète.</p>}
            <Link to="/sales#sales-start">Compléter les ventes et le calendrier de service</Link>
          </div> : <>
            <details className="sales-baseline-method">
              <summary>Évaluation rétrospective</summary>
              <p>{baseline.items.length} article(s) sur {baseline.observedItemCount} disposent de l’historique requis. La moyenne mobile est comparée au même jour de semaine précédent (J−7) sur {baseline.evaluationDays} dates, sans utiliser la vente du jour évalué. EAM et WAPE décrivent les écarts rétrospectifs ; ils ne garantissent pas les résultats futurs.</p>
            </details>
            <p id="sales-baseline-table-hint" className="sales-baseline-table-hint">Sur petit écran, les résultats sont présentés en fiches. Sur grand écran, faites défiler le tableau horizontalement ; au clavier, placez le focus sur la zone puis utilisez ← et →.</p>
            <div className="sales-baseline-table"><div className="sales-table-wrap" role="region" aria-label="Prévision des ventes par article" aria-describedby="sales-baseline-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="sales-table">
              <thead><tr>
              <th>Article vendu</th><th>Prévision pour le {baseline.forecastDate}</th>
              <th>Volume observé · {baseline.evaluationDays} j</th><th>EAM · moyenne 7 j</th><th>EAM · même jour J−7</th>
              <th>WAPE · moyenne 7 j</th><th>WAPE · même jour J−7</th><th>Projection recette datée</th>
            </tr></thead><tbody>{baseline.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item) => <tr key={item.saleItemId}>
              <td>{item.saleItemName}</td><td>{formatQuantity(item.forecastQuantity)} unités</td>
              <td>{formatQuantity(item.backtest.observedQuantity)} unités</td>
              <td>{formatQuantity(item.backtest.rollingMean7.meanAbsoluteError)} unités</td>
              <td>{formatQuantity(item.backtest.previousWeekday.meanAbsoluteError)} unités</td>
              <td>{item.backtest.rollingMean7.weightedAbsolutePercentageError === null ? "Non calculable" : `${formatQuantity(item.backtest.rollingMean7.weightedAbsolutePercentageError)} %`}</td>
              <td>{item.backtest.previousWeekday.weightedAbsolutePercentageError === null ? "Non calculable" : `${formatQuantity(item.backtest.previousWeekday.weightedAbsolutePercentageError)} %`}</td>
              <td><RecipeProjectionDetails item={item} /></td>
            </tr>)}</tbody></table></div></div>
            <p className="sales-baseline-cards-hint">Comparaison de la moyenne mobile et du même jour de semaine précédent ; ouvrez la projection recette pour en consulter les détails.</p>
            <ul className="sales-baseline-cards" aria-label="Prévisions et comparaisons par article">
              {baseline.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item) => <li className="sales-baseline-card" key={item.saleItemId}>
                <h3>{item.saleItemName}</h3>
                <dl>
                  <div><dt>Prévision pour le {baseline.forecastDate}</dt><dd>{formatQuantity(item.forecastQuantity)} unités</dd></div>
                  <div><dt>Volume observé · {baseline.evaluationDays} j</dt><dd>{formatQuantity(item.backtest.observedQuantity)} unités</dd></div>
                  <div><dt>EAM · moyenne 7 j</dt><dd>{formatQuantity(item.backtest.rollingMean7.meanAbsoluteError)} unités · WAPE {item.backtest.rollingMean7.weightedAbsolutePercentageError === null ? "non calculable" : `${formatQuantity(item.backtest.rollingMean7.weightedAbsolutePercentageError)} %`}</dd></div>
                  <div><dt>EAM · même jour J−7</dt><dd>{formatQuantity(item.backtest.previousWeekday.meanAbsoluteError)} unités · WAPE {item.backtest.previousWeekday.weightedAbsolutePercentageError === null ? "non calculable" : `${formatQuantity(item.backtest.previousWeekday.weightedAbsolutePercentageError)} %`}</dd></div>
                  <div><dt>Projection recette datée</dt><dd><RecipeProjectionDetails item={item} /></dd></div>
                </dl>
              </li>)}
            </ul>
            {baseline.items.length > PAGE_SIZE && <div className="sales-actions">
              <Button type="button" variant="outline" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Articles précédents</Button>
              <span role="status">Articles {page * PAGE_SIZE + 1} à {Math.min((page + 1) * PAGE_SIZE, baseline.items.length)} sur {baseline.items.length}</span>
              <Button type="button" variant="outline" disabled={(page + 1) * PAGE_SIZE >= baseline.items.length} onClick={() => setPage((current) => current + 1)}>Articles suivants</Button>
            </div>}
          </>}
      </>}
  </section>;
}
