import { useSearchParams } from "react-router-dom";
import BilanNavigation from "../components/analytics/BilanNavigation";
import ForecastNeeds from "../components/analytics/ForecastNeeds";
import SalesBaseline from "../components/sales/SalesBaseline";
import "../styles/Workspace.css";
import "./Analytics.css";
import "./Predictions.css";
import "./Sales.css";
import { formatLocalISODate, isValidISODate } from "../utils/date";

export default function Predictions() {
  const [searchParams] = useSearchParams();
  const today = formatLocalISODate(new Date());
  const requestedFrom = searchParams.get("from");
  const requestedTo = searchParams.get("to");
  const from = isValidISODate(requestedFrom) ? requestedFrom : `${today.slice(0, 4)}-01-01`;
  const to = isValidISODate(requestedTo) ? requestedTo : today;

  return <div className="workspace-page predictions-container">
    <header className="workspace-header">
      <div>
        <h1>Bilan</h1>
        <p className="workspace-subtitle">Comprenez votre activité, repérez les pertes et retrouvez les points à compléter.</p>
      </div>
    </header>
    <BilanNavigation active="predictions" from={from} to={to} />
    <SalesBaseline />
    <ForecastNeeds />
  </div>;
}
