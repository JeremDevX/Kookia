import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import SupplierSettings from "../components/settings/SupplierSettings";
import { Store, Users, Plug, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import AccountSettings from "../features/account/AccountSettings";
import "./Settings.css";
import "../styles/Workspace.css";
import "./InsightsSettings.css";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeTab = requestedSection === "suppliers" || requestedSection === "connections" || requestedSection === "account" ? requestedSection : "restaurant";
  const tabs = [
    { id: "restaurant", label: "Restaurant", icon: Store },
    { id: "suppliers", label: "Fournisseurs", icon: Users },
    { id: "connections", label: "Connexions", icon: Plug },
    { id: "account", label: "Compte", icon: UserRound },
  ] as const;

  return (
    <div className="settings-container workspace-page">
      <header className="workspace-header">
        <div>
          <h1>Réglages</h1>
        </div>
      </header>

      <div className="settings-layout">
        <Card className="settings-nav-card">
          <p className="settings-nav-label">RUBRIQUES</p>
          <nav className="settings-nav" aria-label="Rubriques des paramètres">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                aria-pressed={activeTab === tab.id}
                aria-controls="settings-panel"
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setSearchParams(tab.id === "restaurant" ? {} : { section: tab.id })}
              >
                <tab.icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        <div className="settings-content" id="settings-panel">
          {activeTab === "restaurant" && <RestaurantSettings />}
          {activeTab === "suppliers" && <SupplierSettings />}
          {activeTab === "connections" && <Card title="Caisses et facturation">
            <p className="settings-section-intro">Aucune connexion automatique n'est disponible aujourd'hui. Aucun paramètre de caisse ou de facturation ne peut encore être enregistré.</p>
            <h3>Caisses envisagées</h3>
            <ul className="connection-list">{["Innovorder", "Lightspeed", "SumUp"].map((name) =>
              <li className="integration-item" key={name}><strong>{name}</strong><Badge label="Non disponible" status="neutral" /></li>)}</ul>
            <h3>Facturation</h3>
            <p>Pas de connexion à un logiciel de facturation. Les factures peuvent être saisies manuellement depuis Aujourd'hui.</p>
            <p>Pour vos ventes, utilisez actuellement l'<Link to="/sales#sales-import-title">import CSV Kookia</Link> ou la saisie manuelle.</p>
          </Card>}
          {activeTab === "account" && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}
