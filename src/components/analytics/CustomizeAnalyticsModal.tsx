import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Settings, Target, AlertCircle } from "lucide-react";
import type { AnalyticsSettings } from "../../types/callbacks";

interface CustomizeAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: AnalyticsSettings;
  onSave: (settings: AnalyticsSettings) => Promise<void>;
}

const CustomizeAnalyticsModal: React.FC<CustomizeAnalyticsModalProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}) => {
  const [settings, setSettings] = useState<AnalyticsSettings>(initialSettings);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError("");
      await onSave(settings);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Affichage des analyses"
      width="md"
    >
      <div className="flex flex-col gap-4">
        {saveError && <p role="alert">{saveError}</p>}
        {/* Waste Target */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-primary" />
            <h4 className="font-semibold">Cible interne</h4>
          </div>
          <div>
            <label htmlFor="customizeanalyticsmodal-1" className="block text-sm font-medium mb-2">
              Pertes visées par couvert (g)
            </label>
            <input id="customizeanalyticsmodal-1"
              type="number"
              className="input-field"
              value={settings.wasteTarget}
              onChange={(e) =>
                setSettings({ ...settings, wasteTarget: e.target.value })
              }
            />
            <p className="text-xs text-secondary mt-1">
              Repère interne, sans valeur réglementaire.
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
            <label htmlFor="analytics-show-trends" className="flex items-center gap-3 cursor-pointer">
              <input
                id="analytics-show-trends"
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
                  Afficher le graphique hebdomadaire
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
                <div className="font-medium text-sm">Prévisions d’exemple</div>
                <div className="text-xs text-secondary">
                  Afficher le scénario de précision
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
                <div className="font-medium text-sm">Économies simulées</div>
                <div className="text-xs text-secondary">
                  Afficher le graphique et le simulateur
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
            <label htmlFor="customizeanalyticsmodal-2" className="block text-sm font-medium mb-2">
              Seuil de précision du scénario (%)
            </label>
            <input id="customizeanalyticsmodal-2"
              type="number"
              min="0"
              max="100"
              className="input-field"
              value={settings.alertThreshold}
              onChange={(e) =>
                setSettings({ ...settings, alertThreshold: e.target.value })
              }
            />
            <p className="text-xs text-secondary mt-1">
              Réglage enregistré, sans alerte automatique.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomizeAnalyticsModal;
