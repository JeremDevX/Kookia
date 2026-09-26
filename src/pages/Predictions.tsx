import SalesBaseline from "../components/sales/SalesBaseline";
import "../styles/Workspace.css";
import "./Predictions.css";
import "./Sales.css";

export default function Predictions() {
  return <div className="workspace-page predictions-container">
    <header className="workspace-header">
      <div>
        <h1>Prévisions</h1>
        <p className="workspace-subtitle">
          Méthode expérimentale fondée sur les ventes enregistrées et les jours de service complets.
        </p>
      </div>
    </header>
    <SalesBaseline />
  </div>;
}
