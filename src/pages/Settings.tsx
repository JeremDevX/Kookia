import React, { useState } from "react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import IntegrationModal from "../components/settings/IntegrationModal";
import { Store, Package, Users, Plug, Save } from "lucide-react";
import "./Settings.css";

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
    "restaurant" | "products" | "suppliers" | "integrations"
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
  ] as const;

  return (
    <div className="settings-container">
      <header className="page-header glass-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Gérez vos configuration</p>
        </div>
        <Button icon={<Save size={18} />}>Enregistrer</Button>
      </header>

      <div className="settings-layout">
        {/* Sidebar Navigation for Settings */}
        <Card className="settings-nav-card">
          <nav className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Content Area */}
        <div className="settings-content">
          {activeTab === "restaurant" && (
            <Card title="Informations Restaurant">
              <div className="form-grid">
                <Input
                  label="Nom du restaurant"
                  defaultValue="La Pizzeria de Camille"
                />
                <div className="grid-2">
                  <Input label="Type" defaultValue="Pizzeria / Crêperie" />
                  <Input label="Couverts moyen / jour" defaultValue="350" />
                </div>
                <Input
                  label="Adresse"
                  defaultValue="12 Rue de Grenoble, 38000 Grenoble"
                />
                <div className="grid-2">
                  <Input label="Téléphone" defaultValue="+33 1 23 45 67 89" />
                  <Input
                    label="Email de contact"
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
                <p>Liste des produits (Mock)</p>
                <Button size="sm">Ajouter un produit</Button>
              </div>
            </Card>
          )}

          {activeTab === "suppliers" && (
            <Card title="Fournisseurs">
              <div className="empty-state">
                <Users size={48} color="var(--color-border)" />
                <p>Gestion fournisseurs (Mock)</p>
                <Button size="sm">Ajouter un fournisseur</Button>
              </div>
            </Card>
          )}

          {activeTab === "integrations" && (
            <Card title="Intégrations Externes">
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
                      <span className="status connected">Connecté</span>
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
