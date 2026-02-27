import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Settings, Target, TrendingUp, AlertCircle } from "lucide-react";
import type { AnalyticsSettings } from "../../types/callbacks";

interface CustomizeAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AnalyticsSettings) => void;
}

const CustomizeAnalyticsModal: React.FC<CustomizeAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState({
    wasteTarget: "50",
    showTrends: true,
    showAI: true,
    showROI: true,
    alertThreshold: "80",
  });

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personnaliser le tableau de bord"
      width="md"
    >
      <div className="flex flex-col gap-4">
        {/* Waste Target */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-primary" />
            <h4 className="font-semibold">Objectifs de gaspillage</h4>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Cible de gaspillage par couvert (grammes)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              value={settings.wasteTarget}
              onChange={(e) =>
                setSettings({ ...settings, wasteTarget: e.target.value })
              }
            />
            <p className="text-xs text-secondary mt-1">
              Recommandé: 30-50g selon la loi AGEC
            </p>
          </div>
        </div>

        {/* Visible Sections */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Settings size={18} className="text-primary" />
            <h4 className="font-semibold">Sections visibles</h4>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTrends}
                onChange={(e) =>
                  setSettings({ ...settings, showTrends: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium text-sm">
                  Évolution du gaspillage
                </div>
                <div className="text-xs text-secondary">
                  Graphique hebdomadaire
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showAI}
                onChange={(e) =>
                  setSettings({ ...settings, showAI: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium text-sm">Performance IA</div>
                <div className="text-xs text-secondary">
                  Fiabilité des prédictions
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showROI}
                onChange={(e) =>
                  setSettings({ ...settings, showROI: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium text-sm">ROI et économies</div>
                <div className="text-xs text-secondary">
                  Simulateur et graphiques
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-primary" />
            <h4 className="font-semibold">Alertes</h4>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Seuil d'alerte de précision IA (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full px-3 py-2 border rounded-md"
              value={settings.alertThreshold}
              onChange={(e) =>
                setSettings({ ...settings, alertThreshold: e.target.value })
              }
            />
            <p className="text-xs text-secondary mt-1">
              Recevoir une alerte si la précision descend sous ce seuil
            </p>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-md border border-green-200 flex items-start gap-2">
          <TrendingUp size={16} className="text-optimal mt-0.5" />
          <div className="text-sm text-green-800">
            <strong>Conseil:</strong> Ajustez vos objectifs progressivement pour
            maintenir la motivation de l'équipe.
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer les paramètres</Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomizeAnalyticsModal;
