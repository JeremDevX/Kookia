import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import ServiceScheduleSettings from "../components/settings/ServiceScheduleSettings";
import { useSharedServiceWeather } from "../features/services/weather.context";
import { readServiceContext, serviceContextHref } from "../features/services/serviceNavigation";
import SupplierSettings from "../components/settings/SupplierSettings";
import ConnectionsSettings from "../components/settings/ConnectionsSettings";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import AccountSettings from "../features/account/AccountSettings";
import InvitationManager from "../features/invitations/InvitationManager";
import MemberManager from "../features/members/MemberManager";
import "../styles/Workspace.css";
import "./InsightsSettings.css";
import "./Settings.css";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingInvitation, setPendingInvitation] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState(false);
  const blocker = useBlocker(pendingSchedule);
  useEffect(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);
  const context = readServiceContext(searchParams);
  const weather = useSharedServiceWeather();
  const requestedSection = searchParams.get("section");
  const activeTab = requestedSection === "team" || requestedSection === "suppliers" || requestedSection === "connections" || requestedSection === "account" ? requestedSection : "restaurant";
  const tabs = [
    { id: "restaurant", label: "Restaurant" },
    { id: "account", label: "Compte" },
    { id: "team", label: "Équipe" },
    { id: "suppliers", label: "Fournisseurs" },
    { id: "connections", label: "Connexions" },
  ] as const;

  return (
    <div className="settings-container workspace-page">
      <div className="settings-heading-panel">
      <header className="workspace-header">
        <div>
          <h1>Paramètres</h1>
          <p className="workspace-subtitle">Gérez votre restaurant et votre compte.</p>
          {context && <Link to={serviceContextHref("/services", context)}>Revenir au service du {context.date} · {context.slot === "lunch" ? "midi" : "soir"}</Link>}
        </div>
      </header>

          <nav className="settings-nav" aria-label="Rubriques des paramètres">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                disabled={(pendingInvitation && tab.id !== "team") || (pendingSchedule && tab.id !== "restaurant")}
                aria-label={tab.label}
                aria-pressed={activeTab === tab.id}
                aria-controls="settings-panel"
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { const next = new URLSearchParams(searchParams); next.set("section", tab.id); setSearchParams(next); }}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
      </div>

        {pendingSchedule && <p role="status">Enregistrez ou annulez les modifications des horaires avant de quitter cette rubrique.</p>}
        <div className="settings-content" id="settings-panel">
          {activeTab === "restaurant" && <><RestaurantSettings onSaved={weather.state.reload} />
            <Card title="Météo"><Button type="button" variant="outline" aria-haspopup="dialog" onClick={weather.openSettings}>Ouvrir les réglages météo</Button></Card>
            <ServiceScheduleSettings onPendingChange={setPendingSchedule} /></>}
          {activeTab === "suppliers" && <SupplierSettings />}
          {activeTab === "connections" && <ConnectionsSettings onWeatherSettings={weather.openSettings} />}
          {activeTab === "account" && <AccountSettings />}
          {activeTab === "team" && <>{pendingInvitation && <p>Copiez le lien puis sélectionnez « J’ai terminé » avant de changer de rubrique.</p>}<MemberManager /><InvitationManager onPendingLinkChange={setPendingInvitation} /></>}
        </div>
    </div>
  );
}
