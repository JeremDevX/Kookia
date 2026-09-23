import React, { useState } from "react";
import Card from "../components/common/Card";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import SupplierSettings from "../components/settings/SupplierSettings";
import Button from "../components/common/Button";
import IntegrationModal from "../components/settings/IntegrationModal";
import { Store, Package, Users, Plug, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import AccountSettings from "../features/account/AccountSettings";
import "./Settings.css";
import "../styles/Workspace.css";
import "./InsightsSettings.css";

interface Integration {
  id: string;
  name: string;
  shortName: string;
  gradient: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "innovorder",
    name: "Innovorder",
    shortName: "IO",
    gradient: "linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)",
  },
  {
    id: "lightspeed",
    name: "Lightspeed",
    shortName: "LS",
    gradient: "linear-gradient(135deg, #00D4AA 0%, #00B894 100%)",
  },
  {
    id: "sumup",
    name: "SumUp",
    shortName: "SU",
    gradient: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)",
  },
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "restaurant" | "products" | "suppliers" | "integrations" | "account"
  >("restaurant");
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);

  const handleOpenIntegrationModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsIntegrationModalOpen(true);
  };

  const tabs = [
    { id: "restaurant", label: "Restaurant", icon: Store },
    { id: "products", label: "Produits", icon: Package },
    { id: "suppliers", label: "Fournisseurs", icon: Users },
    { id: "integrations", label: "Intégrations", icon: Plug },
    { id: "account", label: "Compte", icon: UserRound },
  ] as const;

  return (
    <div className="settings-container workspace-page">
      <header className="workspace-header">
        <div>
          <h1>Paramètres</h1>
        </div>
      </header>

      <div className="settings-layout">
        {/* Sidebar Navigation for Settings */}
        <Card className="settings-nav-card">
          <p className="settings-nav-label">RUBRIQUES</p>
          <nav className="settings-nav" aria-label="Rubriques des paramètres">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                aria-pressed={activeTab === tab.id}
                aria-controls="settings-panel"
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Content Area */}
        <div className="settings-content" id="settings-panel">
          {activeTab === "restaurant" && <RestaurantSettings />}

          {activeTab === "products" && (
            <Card title="Produits">
              <div className="empty-state">
                <Package size={48} color="var(--color-border)" />
                <p>Gérez vos produits depuis la page Stocks.</p>
                <Link to="/stocks" className="btn btn-primary">Ouvrir les stocks</Link>
              </div>
            </Card>
          )}

          {activeTab === "suppliers" && <SupplierSettings />}

          {activeTab === "integrations" && (
            <Card title="Connexions aux caisses">
              <p className="settings-section-intro">Aucune caisse n’est connectée. Les intégrations ci-dessous ne sont pas disponibles.</p>
              {INTEGRATIONS.map((integration) => (
                <div key={integration.id} className="integration-item">
                  <div className="int-info">
                    <div
                      className="int-icon"
                      style={{
                        background: integration.gradient,
                        color: "white",
                        fontWeight: 700,
                      }}
                    >
                      {integration.shortName}
                    </div>
                    <div>
                      <h4>{integration.name}</h4>
                      <span className="integration-demo">Non disponible</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenIntegrationModal(integration)}
                  >
                    Détails
                  </Button>
                </div>
              ))}
            </Card>
          )}
          {activeTab === "account" && <AccountSettings />}
        </div>
      </div>

      {/* Integration Configuration Modal */}
      <IntegrationModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
        integration={selectedIntegration}
      />
    </div>
  );
};

export default Settings;
