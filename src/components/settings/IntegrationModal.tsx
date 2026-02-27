import React from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { CheckCircle, RefreshCw, Trash2, ExternalLink } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  shortName: string;
  gradient: string;
  apiKey?: string;
  lastSync?: string;
  syncedItems?: number;
}

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration | null;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({
  isOpen,
  onClose,
  integration,
}) => {
  if (!integration) return null;

  const getMockData = (name: string) => {
    switch (name) {
      case "Innovorder":
        return {
          apiKey: "io_live_sk_*****************************3f2a",
          lastSync: "Il y a 5 minutes",
          syncedItems: 156,
          features: ["Commandes en ligne", "Click & Collect", "Menu digital"],
        };
      case "Lightspeed":
        return {
          apiKey: "ls_prod_*****************************8b4c",
          lastSync: "Il y a 12 minutes",
          syncedItems: 2340,
          features: ["Ventes POS", "Inventaire", "Rapports"],
        };
      case "SumUp":
        return {
          apiKey: "su_api_*****************************1d7e",
          lastSync: "Il y a 2 minutes",
          syncedItems: 89,
          features: ["Paiements CB", "Historique transactions", "Reçus"],
        };
      default:
        return {
          apiKey: "pos_*****************************9a1b",
          lastSync: "Il y a 30 minutes",
          syncedItems: 450,
          features: ["Synchronisation menu", "Tickets"],
        };
    }
  };

  const mockData = getMockData(integration.name);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configuration ${integration.name}`}
      width="md"
    >
      <div className="flex flex-col gap-lg">
        {/* Header with status */}
        <div
          className="flex items-center gap-md p-md"
          style={{
            background: `linear-gradient(135deg, ${
              integration.gradient.split(",")[0].split("#")[1]
                ? `rgba(${parseInt(
                    integration.gradient.split("#")[1].substring(0, 2),
                    16
                  )}, ${parseInt(
                    integration.gradient.split("#")[1].substring(2, 4),
                    16
                  )}, ${parseInt(
                    integration.gradient.split("#")[1].substring(4, 6),
                    16
                  )}, 0.1)`
                : "var(--color-surface-hover)"
            } 0%, var(--color-surface) 100%)`,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-light)",
          }}
        >
          <div
            style={{
              background: integration.gradient,
              color: "white",
              fontWeight: 700,
              width: 48,
              height: 48,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            {integration.shortName}
          </div>
          <div className="flex-1">
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {integration.name}
            </h3>
            <div className="flex items-center gap-sm mt-sm">
              <Badge label="Connecté" status="optimal" />
              <span
                style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
              >
                Dernière sync: {mockData.lastSync}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--spacing-md)",
          }}
        >
          <div
            style={{
              padding: "var(--spacing-md)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--color-primary)",
              }}
            >
              {mockData.syncedItems}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Éléments Sync
            </div>
          </div>
          <div
            style={{
              padding: "var(--spacing-md)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--color-optimal)",
              }}
            >
              <CheckCircle size={24} />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Status API
            </div>
          </div>
          <div
            style={{
              padding: "var(--spacing-md)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              24/7
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Sync Auto
            </div>
          </div>
        </div>

        {/* API Key */}
        <div>
          <Input label="Clé API" defaultValue={mockData.apiKey} disabled />
          <p
            style={{
              fontSize: 11,
              color: "var(--color-text-secondary)",
              marginTop: 4,
            }}
          >
            La clé API est masquée pour des raisons de sécurité
          </p>
        </div>

        {/* Features */}
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "block",
              marginBottom: 8,
            }}
          >
            Fonctionnalités Actives
          </label>
          <div className="flex flex-wrap gap-sm">
            {mockData.features.map((feature, i) => (
              <span
                key={i}
                style={{
                  padding: "6px 12px",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  borderRadius: "var(--radius-full)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-sm)",
            paddingTop: "var(--spacing-md)",
            borderTop: "1px solid var(--color-border-light)",
          }}
        >
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} />}
            className="flex-1"
          >
            Resynchroniser
          </Button>
          <Button variant="outline" size="sm" icon={<ExternalLink size={14} />}>
            Dashboard {integration.name}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 size={14} />}
            style={{
              color: "var(--color-urgent)",
              borderColor: "var(--color-urgent)",
            }}
          >
            Déconnecter
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrationModal;
