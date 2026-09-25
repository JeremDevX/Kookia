import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import ExportReportModal from "../components/analytics/ExportReportModal";
import SalesMetrics from "../components/sales/SalesMetrics";
import ImpactSummary from "../components/analytics/ImpactSummary";
import { formatLocalISODate } from "../utils/date";
import "./Analytics.css";
import "./Sales.css";
import "../styles/Workspace.css";

const today = () => formatLocalISODate(new Date());
const monthAgo = () => new Date(Date.parse(today()) - 29 * 86_400_000).toISOString().slice(0, 10);

export default function Analytics() {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [exportOpen, setExportOpen] = useState(false);
  const validRange = !!from && !!to && from <= to;

  return <div className="analytics-container workspace-page">
    <header className="workspace-header"><div><h1>Bilan</h1><p className="workspace-subtitle">Ventes enregistrées, pertes déclarées et achats réceptionnés sur la période.</p></div>
      <Button onClick={() => setExportOpen(true)} disabled={!validRange}>Exporter un rapport</Button>
    </header>
    <div className="bilan-period"><label>Du <input type="date" value={from} max={to || today()} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>Au <input type="date" value={to} min={from} max={today()} onChange={(event) => setTo(event.target.value)} /></label></div>
    {!validRange ? <p role="alert">Choisissez une période valide pour consulter le bilan.</p> :
      <><SalesMetrics key={`sales:${from}:${to}`} from={from} to={to} />
        <ImpactSummary key={`impact:${from}:${to}`} from={from} to={to} /></>}
    <p className="bilan-next"><Link to="/sales">Ajouter ou corriger des ventes</Link> · <Link to="/stocks">Vérifier les stocks</Link></p>
    <ExportReportModal key={`${from}:${to}`} isOpen={exportOpen} onClose={() => setExportOpen(false)} initialFrom={from} initialTo={to} />
  </div>;
}
