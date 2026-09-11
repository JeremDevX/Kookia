import React, { useState } from "react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
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
          <p className="workspace-eyebrow">UN ESPACE À VOTRE IMAGE</p>
          <h1>Les détails qui font la différence.</h1>
          <p className="workspace-subtitle">Retrouvez les informations de votre restaurant, vos connexions et les réglages de votre compte.</p>
        </div>
      </header>

      <div className="settings-layout">
        {/* Sidebar Navigation for Settings */}
        <Card className="settings-nav-card">
          <p className="settings-nav-label">VOS PRÉFÉRENCES</p>
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
          {activeTab === "restaurant" && (
            <Card title="Votre restaurant">
              <p className="settings-section-intro">Informations de démonstration. Leur enregistrement n’est pas encore disponible.</p>
              <div className="form-grid">
                <Input
                  label="Nom du restaurant"
                  id="restaurant-name"
                  defaultValue="La Pizzeria de Camille"
                />
                <div className="grid-2">
                  <Input id="restaurant-type" label="Type d’établissement" defaultValue="Pizzeria / Crêperie" />
                  <Input id="restaurant-covers" label="Couverts moyens par jour" defaultValue="350" />
                </div>
                <Input
                  label="Adresse"
                  id="restaurant-address"
                  defaultValue="12 Rue de Grenoble, 38000 Grenoble"
                />
                <div className="grid-2">
                  <Input id="restaurant-phone" label="Téléphone" type="tel" defaultValue="+33 1 23 45 67 89" />
                  <Input
                    label="Email de contact"
                    id="restaurant-email"
                    type="email"
                    defaultValue="contact@lapizzeria.fr"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === "products" && (
            <Card title="Gestion des Produits">
              <div className="empty-state">
                <Package size={48} color="var(--color-border)" />
                <h3>Votre catalogue, au même endroit.</h3>
                <p>Consultez et ajoutez vos produits depuis l’inventaire.</p>
                <Link to="/stocks" className="btn btn-primary">Ouvrir les stocks</Link>
              </div>
            </Card>
          )}

          {activeTab === "suppliers" && (
            <Card title="Fournisseurs">
              <div className="empty-state">
                <Users size={48} color="var(--color-border)" />
                <h3>Vos partenaires au quotidien.</h3>
                <p>La gestion des fournisseurs sera disponible dans cet espace.</p>
              </div>
            </Card>
          )}

          {activeTab === "integrations" && (
            <Card title="Vos outils connectés">
              <p className="settings-section-intro">Découvrez les connexions proposées. Ces configurations sont des démonstrations.</p>
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
                      <span className="integration-demo">Démonstration</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenIntegrationModal(integration)}
                  >
                    Gérer
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
