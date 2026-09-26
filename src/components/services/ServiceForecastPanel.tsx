import { useEffect, useState } from "react";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { ForecastIngredient, ForecastService, OperationalForecast } from "../../../shared/operationalForecast";
import { getOperationalForecast } from "../../services/serviceOperationsService";
import { selectedForecastService } from "./forecastPresentation";
import Button from "../common/Button";
import "./ServiceOperations.css";
const modelLabels = { weekday: "Jour de semaine comparable", service: "Historique du service", seasonal: "Historique saisonnier suffisant", insufficient: "Historique insuffisant" };
const provenanceLabels = { recorded_sales: "Ventes enregistrées", demo_simulation: "Estimations historiques", mixed: "Historique de provenance mixte" };
function IngredientNeeds({ ingredients }: { ingredients: ForecastIngredient[] }) {
  return <>{!ingredients.length && <p>Aucun besoin matière calculable.</p>}
    <ul>{ingredients.map((ingredient) => <li key={ingredient.productId}>{ingredient.productName} : {ingredient.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {ingredient.unit}
      <ul>{ingredient.sources.map((source, index) => <li key={index}>{source.saleItemName} → {source.recipeName}, recette version {source.recipeVersion} : {source.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {ingredient.unit}</li>)}</ul>
    </li>)}</ul></>;
}
export function ForecastServiceView({ service }: { service: ForecastService | null }) {
  if (!service) return <p>Aucune prévision pour ce service. Vérifiez l’ouverture planifiée et la carte datée.</p>;
  return <>
    <p>{service.plannedOpen ? "Service planifié ouvert" : "Service planifié fermé"} · carte version {service.menuRevision}. L’ouverture ne prouve pas que les ventes sont complètes.</p>
    {service.blockers.length > 0 && <ul aria-label="Limites du service">{service.blockers.map((limit, index) => <li key={index}>{limit}</li>)}</ul>}
    {service.items.length === 0 && <p>Aucun article éligible à une prévision.</p>}
    <ul>{service.items.map((item) => <li key={item.entryId}>
      <strong>{item.name} · {item.category}</strong> : {item.quantity == null ? "prévision indisponible" : `${item.quantity.toLocaleString("fr-FR")} articles estimés`}
      <p>Méthode : {modelLabels[item.model]} · {item.observations} services observés.</p>
      <p>Variabilité observée : {item.observedMin == null || item.observedMax == null ? "indisponible" : `${item.observedMin} à ${item.observedMax} articles`}
        {item.deviation == null ? " · dispersion inconnue" : ` · écart-type ${item.deviation.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`}.</p>
    </li>)}</ul>
    <h3>Besoins matières estimés pour ce service</h3>
    <IngredientNeeds ingredients={service.ingredientNeeds} />
    <p>Aucun stock n’est réservé ni déduit par cette prévision.</p>
    <h3>Composition observée par couvert</h3>
    {!service.mix.length && <p>Pas assez de couverts qualifiés pour estimer les parts entrée, plat, dessert ou boisson.</p>}
    <ul>{service.mix.map((part) => <li key={part.category}>{part.category} : {part.portionsPerCover.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} portions par couvert · {part.observedCovers} couverts dans {part.services} services.</li>)}</ul>
    <p>Ces ratios ne sont pas des pourcentages exclusifs : un couvert peut consommer plusieurs catégories.</p>
  </>;
}
export function ForecastPanelContent({ forecast, date, slot }: { forecast: OperationalForecast; date: string; slot: ServiceSlot }) {
  return <>
    <p>Source : {provenanceLabels[forecast.provenance]} · calcul au {forecast.asOfDate} · {forecast.excludedServices} services exclus de l’historique qualifié.</p>
    <ForecastServiceView service={selectedForecastService(forecast, date, slot)} />
    <h3>Hypothèses et limites du calcul</h3>
    <ul>{[...forecast.assumptions, ...forecast.blockers].map((limit, index) => <li key={index}>{limit}</li>)}</ul>
    <p>Les prévisions restent des suggestions à revoir par le chef. Les ventes incomplètes et l’absence de carte peuvent limiter le résultat ; la dispersion observée n’est pas une garantie de précision.</p>
    <details><summary>Besoins matières estimés pour la journée entière (midi et soir)</summary>
      <p>Ce total couvre tous les services inclus du {forecast.fromDate} au {forecast.throughDate}, pas uniquement le service sélectionné. Il ne réserve ni ne déduit de stock.</p>
      <IngredientNeeds ingredients={forecast.ingredientNeeds} />
    </details>
  </>;
}
export default function ServiceForecastPanel({ date, slot }: { date: string; slot: ServiceSlot; onChanged?: () => void }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const past = date < today;
  const [reload, setReload] = useState(0);
  const key = `${date}:${slot}:${reload}`;
  const [response, setResponse] = useState<{ key: string; forecast: OperationalForecast | null; error: string } | null>(null);
  const loading = !past && response?.key !== key;
  const forecast = response?.key === key ? response.forecast : null;
  const error = response?.key === key ? response.error : "";
  useEffect(() => {
    let cancelled = false;
    if (past) return;
    void getOperationalForecast(date, date).then((result) => { if (!cancelled) setResponse({ key, forecast: result, error: "" }); })
      .catch((cause: unknown) => { if (!cancelled) setResponse({ key, forecast: null, error: cause instanceof Error ? cause.message : "Prévisions indisponibles." }); });
    return () => { cancelled = true; };
  }, [date, key, past]);
  return <section className="service-operation-panel" aria-labelledby="service-forecast-title">
    <h2 id="service-forecast-title">Prévisions du {date} · {slot === "lunch" ? "midi" : "soir"}</h2>
    {past ? <p>Les prévisions sont proposées pour aujourd’hui et les dates futures. Consultez la fiche de service pour le résultat historique.</p> : <>
      {loading && <p role="status">Calcul des prévisions…</p>}
      {error && <p role="alert">{error}</p>}
      {forecast && forecast.fromDate === date && !loading && <ForecastPanelContent forecast={forecast} date={date} slot={slot} />}
      <Button type="button" variant="outline" disabled={loading} onClick={() => setReload((value) => value + 1)}>Recalculer les prévisions</Button>
    </>}
  </section>;
}
