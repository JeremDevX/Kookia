import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import ExportReportModal from "../components/analytics/ExportReportModal";
import SalesMetrics from "../components/sales/SalesMetrics";
import ImpactSummary from "../components/analytics/ImpactSummary";
import EstimatedOutflows from "../components/analytics/EstimatedOutflows";
import BilanNavigation from "../components/analytics/BilanNavigation";
import { formatLocalISODate, isValidISODate } from "../utils/date";
import "../styles/Workspace.css";
import "./Sales.css";
import "./Analytics.css";

const today = () => formatLocalISODate(new Date());
const startOfCurrentYear = () => `${today().slice(0, 4)}-01-01`;

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const view = location.hash === "#estimated-outflows-title" ? "estimates" : location.hash === "#impact-summary-title" ? "overview" : searchParams.get("view") || "overview";
  const selectedView = view === "sales" || view === "estimates" ? view : "overview";
  const requestedFrom = searchParams.get("from");
  const requestedTo = searchParams.get("to");
  return <AnalyticsContent key={`${requestedFrom}:${requestedTo}`} selectedView={selectedView} requestedFrom={requestedFrom} requestedTo={requestedTo} />;
}

function AnalyticsContent({ selectedView, requestedFrom, requestedTo }: {
  selectedView: "overview" | "sales" | "estimates"; requestedFrom: string | null; requestedTo: string | null;
}) {
  const [from, setFrom] = useState(() => isValidISODate(requestedFrom) ? requestedFrom : startOfCurrentYear());
  const [to, setTo] = useState(() => isValidISODate(requestedTo) ? requestedTo : today());
  const [exportOpen, setExportOpen] = useState(false);
  const validRange = !!from && !!to && from <= to;

  return <div className="analytics-container workspace-page">
    <header className="workspace-header"><div><h1>Bilan</h1><p className="workspace-subtitle">Comprenez votre activité, repérez les pertes et retrouvez les points à compléter.</p></div>
      <Button onClick={() => setExportOpen(true)} disabled={!validRange}>Exporter un rapport</Button>
    </header>
    <BilanNavigation active={selectedView} from={from} to={to} />
    <section className="bilan-period" aria-label="Période du bilan">
      <label>Du <input type="date" value={from} max={to || today()} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>Au <input type="date" value={to} min={from} max={today()} onChange={(event) => setTo(event.target.value)} /></label>
      <div className="bilan-presets" aria-label="Périodes rapides">
        <Button variant="outline" onClick={() => { setFrom(`${today().slice(0, 7)}-01`); setTo(today()); }}>Ce mois</Button>
        <Button variant="outline" onClick={() => { setFrom(startOfCurrentYear()); setTo(today()); }}>Cette année</Button>
      </div>
    </section>
    {!validRange ? <p role="alert">Choisissez une période valide pour consulter le bilan.</p> :
      <>
        {selectedView === "overview" && <ImpactSummary key={`impact:${from}:${to}`} from={from} to={to} />}
        {selectedView === "sales" && <SalesMetrics key={`sales:${from}:${to}`} from={from} to={to} />}
        {selectedView === "estimates" && <EstimatedOutflows key={`estimated-outflows:${from}:${to}`} from={from} to={to} />}
      </>}
    <p className="bilan-next"><Link to="/sales">Ajouter ou corriger des ventes</Link> · <Link to="/stocks">Vérifier les stocks</Link></p>
    <ExportReportModal key={`${from}:${to}`} isOpen={exportOpen} onClose={() => setExportOpen(false)} initialFrom={from} initialTo={to} />
  </div>;
}
