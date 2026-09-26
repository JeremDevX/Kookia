import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import EstimatedOutflows from "../components/analytics/EstimatedOutflows";
import SalesBaseline from "../components/sales/SalesBaseline";
import "../styles/Workspace.css";
import "./Analytics.css";
import "./Predictions.css";
import "./Sales.css";
import { formatLocalISODate, isValidISODate } from "../utils/date";

const today = () => formatLocalISODate(new Date());
const startOfCurrentYear = () => `${today().slice(0, 4)}-01-01`;

export default function Predictions() {
  const [searchParams] = useSearchParams();
  const requestedFrom = searchParams.get("from");
  const requestedTo = searchParams.get("to");
  const [from, setFrom] = useState(() => isValidISODate(requestedFrom) ? requestedFrom : startOfCurrentYear());
  const [to, setTo] = useState(() => isValidISODate(requestedTo) ? requestedTo : today());
  const validRange = !!from && !!to && from <= to;

  return <div className="workspace-page predictions-container">
    <header className="workspace-header">
      <div>
        <h1>Prévisions</h1>
        <p className="workspace-subtitle">
          Deux calculs distincts : sorties estimées d’ingrédients et ventes prévisionnelles fondées sur les ventes enregistrées.
        </p>
      </div>
    </header>
    <section className="predictions-period" aria-labelledby="predictions-period-title">
      <h2 id="predictions-period-title">Période des réceptions</h2>
      <div className="predictions-period-fields">
        <label>Du <input type="date" value={from} max={to || today()} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Au <input type="date" value={to} min={from} max={today()} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <p>Choisissez toute plage de dates. Les estimations utilisent les quantités réceptionnées et les recettes datées ; elles ne remplacent pas les ventes enregistrées.</p>
    </section>
    {!validRange ? <p role="alert">Choisissez une période de réceptions valide.</p> :
      <EstimatedOutflows key={`estimated-outflows:${from}:${to}`} from={from} to={to} />}
    <SalesBaseline />
  </div>;
}
