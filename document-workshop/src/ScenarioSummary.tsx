import { memo, useState } from "react";
import { displayDate } from "./calendar";
import { number } from "./catalog";
import type { Day, RecipeRun, Scenario } from "./model";
import { scenarioWeatherSummary, terraceLabel } from "./weather";
import "./workshopDocuments.css";

const sumRuns = (runs: RecipeRun[], key: "prepared" | "sold" | "unsold" | "unserved") =>
  number(runs.reduce((total, run) => total + run[key], 0));

function ActivityDay({ day }: { day: Day }) {
  const runs = day.services.flatMap(service => service.runs);
  const plateReturns = day.waste.filter(entry => entry.kind === "plate_return").reduce((total, entry) => total + entry.quantity, 0);
  return <div className="activity-day">
    {day.open ? <>
      <div className="activity-breakdown">
        <section>
          <h3>Couverts</h3>
          <dl className="workshop-facts">
            <div><dt>Base avant météo</dt><dd>{number(day.baselineCovers)}</dd></div>
            <div><dt>Prévu ajusté</dt><dd>{number(day.forecastCovers)}</dd></div>
            <div><dt>Demandés</dt><dd>{number(day.covers)}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Articles</h3>
          <dl className="workshop-facts">
            <div><dt>Préparés</dt><dd>{sumRuns(runs, "prepared")}</dd></div>
            <div><dt>Servis</dt><dd>{sumRuns(runs, "sold")}</dd></div>
            <div><dt>Invendus</dt><dd>{sumRuns(runs, "unsold")}</dd></div>
            <div><dt>Demandes non servies</dt><dd>{sumRuns(runs, "unserved")}</dd></div>
          </dl>
        </section>
      </div>
      <div className="activity-weather">
        <h3>Météo du dossier</h3>
        <p>{scenarioWeatherSummary(day.weather)}. {day.weather.reason}</p>
      </div>
    </> : <p className="workshop-muted">Restaurant fermé.</p>}
    {day.events.length > 0 && <ul className="activity-events">{day.events.map((event, index) => <li key={index}>{event}</li>)}</ul>}
    <p className="hint">{number(day.closingLots.length)} {day.closingLots.length === 1 ? "lot reporté" : "lots reportés"}.
      {plateReturns > 0 && <> Retours d’assiette estimés à {number(plateReturns)} équiv. portions.</>}</p>
  </div>;
}

export const ScenarioSummary = memo(function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  const [selectedDate, setSelectedDate] = useState(scenario.options.start);
  const day = scenario.days.find(entry => entry.date === selectedDate) ?? scenario.days[0];
  const runs = scenario.days.flatMap(entry => entry.services.flatMap(service => service.runs));
  return <section className="activity-summary panel" aria-labelledby="activity-title">
    <h2 id="activity-title" tabIndex={-1}>Activité du dossier</h2>
    <dl className="activity-metrics workshop-facts">
      <div><dt>Jours ouverts</dt><dd>{number(scenario.days.filter(entry => entry.open).length)}</dd></div>
      <div><dt>Articles préparés</dt><dd>{sumRuns(runs, "prepared")}</dd></div>
      <div><dt>Articles servis</dt><dd>{sumRuns(runs, "sold")}</dd></div>
      <div><dt>Articles invendus</dt><dd>{sumRuns(runs, "unsold")}</dd></div>
      <div><dt>Demandes non servies</dt><dd>{sumRuns(runs, "unserved")}</dd></div>
    </dl>
    <details className="workshop-details"><summary><span>Détail par jour</span></summary>
      <div className="activity-controls">
        <label>Journée
          <select value={day.date} onChange={event => setSelectedDate(event.currentTarget.value)}>
            {scenario.days.map(entry => <option key={entry.date} value={entry.date}>
              {displayDate(entry.date)}{entry.open ? "" : " · fermé"}
            </option>)}
          </select>
        </label>
        <p className="hint">Terrasse · {terraceLabel(scenario.options.hasTerrace)}.
          {scenario.options.weather === "none" ? " Sans ajustement météo." : " Météo simulée sans observation ni prévision Open-Meteo."}</p>
      </div>
      <ActivityDay day={day} />
    </details>
  </section>;
});
