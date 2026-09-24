import Card from "../components/common/Card";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import SupplierSettings from "../components/settings/SupplierSettings";
import ConnectionsSettings from "../components/settings/ConnectionsSettings";
import { Store, Users, Plug, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
                aria-label={tab.label}
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
          {activeTab === "connections" && <ConnectionsSettings />}
          {activeTab === "account" && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}
