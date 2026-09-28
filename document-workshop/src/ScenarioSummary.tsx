import { number } from "./catalog";
import type { Scenario } from "./model";
import { scenarioWeatherNotice, scenarioWeatherSummary, terraceLabel } from "./weather";

export function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  const runs = scenario.days.flatMap(d => d.services.flatMap(s => s.runs));
  const sum = (key: "prepared" | "sold" | "unsold" | "unserved") => runs.reduce((total, r) => total + r[key], 0);
  return <section className="activity-summary" aria-labelledby="activity-title">
    <h3 id="activity-title">De la prévision au service</h3>
    <p>{scenario.days.filter(d => d.open).length} jours ouverts · {sum("prepared")} articles préparés · {sum("sold")} servis · <strong>{sum("unsold")} invendus</strong> · {sum("unserved")} demandes non servies.</p>
    <p className="hint">Les achats précèdent la demande du service. Les invendus et retours d’assiette sont déjà compris dans la matière utilisée en production. Hypothèses de travail, sans calibration terrain.</p>
    <p>Terrasse : {terraceLabel(scenario.options.hasTerrace)}. {scenario.options.weather === "none" ? "Sans ajustement météo." : scenarioWeatherNotice}</p>
    <details><summary>Voir les journées, les incidents et les reports de stock</summary><div className="table-scroll" tabIndex={0} role="region" aria-label="Comparaison des journées">
      <table><thead><tr><th scope="col">Date</th><th scope="col">Base avant météo</th><th scope="col">Météo du dossier</th><th scope="col">Prévu ajusté</th><th scope="col">Demandé</th><th scope="col">Préparé</th><th scope="col">Servi</th><th scope="col">Invendu</th><th scope="col">Situation</th></tr></thead>
        <tbody>{scenario.days.map(day => {
          const dailyRuns = day.services.flatMap(s => s.runs);
          return <tr key={day.date}><th scope="row">{day.date}</th><td>{day.baselineCovers}</td>
            <td>{day.open ? <>{scenarioWeatherSummary(day.weather)}<br/>{day.weather.reason}</> : "Fermé · sans effet météo"}</td><td>{day.forecastCovers}</td><td>{day.covers}</td>
            <td>{dailyRuns.reduce((n, r) => n + r.prepared, 0)}</td><td>{dailyRuns.reduce((n, r) => n + r.sold, 0)}</td><td>{dailyRuns.reduce((n, r) => n + r.unsold, 0)}</td>
            <td>{!day.open ? "Fermé" : day.events.join(" ") || "Service habituel"} · {day.closingLots.length} lots reportés</td></tr>;
        })}</tbody></table>
    </div><p className="hint">Base avant météo, Prévu ajusté et Demandé comptent les couverts ; Préparé, Servi et Invendu comptent les articles. La base suit la semaine et la saison, pas des ventes mesurées. La même météo de journée s’applique à midi et au soir, avec arrondi des couverts par service. Retours d’assiette : {number(scenario.days.flatMap(d => d.waste).filter(w => w.kind === "plate_return").reduce((n, w) => n + w.quantity, 0))} équivalents-portions estimés.</p></details>
  </section>;
}
