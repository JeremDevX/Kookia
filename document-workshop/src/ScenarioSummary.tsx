import { memo } from "react";
import { displayDate } from "./calendar";
import { number } from "./catalog";
import type { Scenario } from "./model";
import { scenarioWeatherSummary, terraceLabel } from "./weather";

export const ScenarioSummary = memo(function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  const runs = scenario.days.flatMap(d => d.services.flatMap(s => s.runs));
  const sum = (key: "prepared" | "sold" | "unsold" | "unserved") => runs.reduce((total, r) => total + r[key], 0);
  return <section className="activity-summary panel" aria-labelledby="activity-title">
    <h2 id="activity-title">Activité du dossier</h2>
    <dl className="activity-metrics workshop-facts">
      <div><dt>Jours ouverts</dt><dd>{scenario.days.filter(d => d.open).length}</dd></div>
      <div><dt>Articles préparés</dt><dd>{number(sum("prepared"))}</dd></div>
      <div><dt>Articles servis</dt><dd>{number(sum("sold"))}</dd></div>
      <div><dt>Articles invendus</dt><dd>{number(sum("unsold"))}</dd></div>
      <div><dt>Demandes non servies</dt><dd>{number(sum("unserved"))}</dd></div>
    </dl>
    <details className="workshop-details"><summary><span>Détail par jour</span></summary>
      <p className="hint">Terrasse · {terraceLabel(scenario.options.hasTerrace)}. {scenario.options.weather === "none" ? "Sans ajustement météo." : "Météo simulée sans observation ni prévision Open-Meteo."}</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Comparaison des journées">
      <table><thead><tr><th scope="col">Date</th><th scope="col">Base avant météo</th><th scope="col">Météo du dossier</th><th scope="col">Prévu ajusté</th><th scope="col">Demandé</th><th scope="col">Préparé</th><th scope="col">Servi</th><th scope="col">Invendu</th><th scope="col">Situation</th></tr></thead>
        <tbody>{scenario.days.map(day => {
          const dailyRuns = day.services.flatMap(s => s.runs);
          return <tr key={day.date}><th scope="row">{displayDate(day.date)}</th><td>{day.baselineCovers}</td>
            <td>{day.open ? <>{scenarioWeatherSummary(day.weather)}<br/>{day.weather.reason}</> : "Fermé · sans effet météo"}</td><td>{day.forecastCovers}</td><td>{day.covers}</td>
            <td>{dailyRuns.reduce((n, r) => n + r.prepared, 0)}</td><td>{dailyRuns.reduce((n, r) => n + r.sold, 0)}</td><td>{dailyRuns.reduce((n, r) => n + r.unsold, 0)}</td>
            <td>{!day.open ? "Fermé" : day.events.join(" ") || "Service habituel"} · {day.closingLots.length} lots reportés</td></tr>;
        })}</tbody></table>
    </div><p className="hint">Fréquentation en couverts. Préparations, ventes et invendus en articles. Retours d’assiette · {number(scenario.days.flatMap(d => d.waste).filter(w => w.kind === "plate_return").reduce((n, w) => n + w.quantity, 0))} équivalents-portions estimés.</p></details>
  </section>;
});
