import Card from "../components/common/Card";
import Button from "../components/common/Button";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import ServiceScheduleSettings from "../components/settings/ServiceScheduleSettings";
import { useSharedServiceWeather } from "../features/services/weather.context";
import { readServiceContext, serviceContextHref } from "../features/services/serviceNavigation";
import SupplierSettings from "../components/settings/SupplierSettings";
import ConnectionsSettings from "../components/settings/ConnectionsSettings";
import { Store, Users, Plug, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import AccountSettings from "../features/account/AccountSettings";
import "./Settings.css";
import "../styles/Workspace.css";
import "./InsightsSettings.css";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const context = readServiceContext(searchParams);
  const weather = useSharedServiceWeather();
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
          {context && <Link to={serviceContextHref("/services", context)}>Revenir au service du {context.date} · {context.slot === "lunch" ? "midi" : "soir"}</Link>}
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
                onClick={() => { const next = new URLSearchParams(searchParams); next.set("section", tab.id); setSearchParams(next); }}
              >
                <tab.icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        <div className="settings-content" id="settings-panel">
          {activeTab === "restaurant" && <><RestaurantSettings onSaved={weather.state.reload} />
            <Card title="Météo"><Button type="button" variant="outline" aria-haspopup="dialog" onClick={weather.openSettings}>Ouvrir les réglages météo</Button></Card>
            <ServiceScheduleSettings onSaved={weather.state.reload} /></>}
          {activeTab === "suppliers" && <SupplierSettings />}
          {activeTab === "connections" && <ConnectionsSettings onWeatherSettings={weather.openSettings} />}
          {activeTab === "account" && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}
