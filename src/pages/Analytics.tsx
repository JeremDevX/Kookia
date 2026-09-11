import React, { useState } from "react";
import Button from "../components/common/Button";
import ExportReportModal from "../components/analytics/ExportReportModal";
import CustomizeAnalyticsModal from "../components/analytics/CustomizeAnalyticsModal";
import WasteChart from "../components/analytics/charts/WasteChart";
import AITrendChart from "../components/analytics/charts/AITrendChart";
import SavingsChart from "../components/analytics/charts/SavingsChart";
import { Download } from "lucide-react";
import ROISimulator from "../components/analytics/ROISimulator";
import { useToast } from "../context/ToastContext";
import { useAnalytics } from "../hooks";
import type { AnalyticsSettings } from "../types/callbacks";
import { useAnalyticsPreferences } from "../features/analytics/useAnalyticsPreferences";
import "./Analytics.css";
import "../styles/Workspace.css";
import "./InsightsSettings.css";

const Analytics: React.FC = () => {
  const { addToast } = useToast();
  const { data } = useAnalytics();
  const { settings: analyticsSettings, saveSettings } =
    useAnalyticsPreferences();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const handleExport = (format: string, period: string) => {
    addToast(
      "success",
      "Rapport généré",
      `Rapport AGEC ${period} exporté en ${format.toUpperCase()}. Téléchargement en cours...`
    );
  };

  const handleSaveSettings = async (settings: AnalyticsSettings) => {
    try {
      await saveSettings(settings);
      addToast(
        "success",
        "Parametres enregistres",
        "Vos preferences d'affichage ont ete mises a jour."
      );
    } catch (error) {
      addToast(
        "info",
        "Echec de sauvegarde",
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant la sauvegarde."
      );
      throw error;
    }
  };

  // Stable value for display (simulated prediction count)
  const predictionCount = 1247;

  if (!data) {
    return (
      <div className="analytics-container workspace-page" role="status">
        <header className="page-header glass-header">
          <div>
            <h1 className="page-title">Analyses</h1>
            <p className="page-subtitle">Chargement des donnees analytics...</p>
          </div>
        </header>
      </div>
    );
  }

  const { wasteStats, aiReliability, wasteEvolution, savingsEvolution, criticalProducts } =
    data;

  return (
    <div className="analytics-container workspace-page">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">COMPRENDRE POUR MIEUX AGIR</p>
          <h1>Vos progrès, en perspective.</h1>
          <p className="workspace-subtitle">Suivez les pertes, explorez les tendances et mesurez vos pistes d’amélioration.</p>
        </div>
        <div className="flex gap-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizeModalOpen(true)}
          >
            Personnaliser
          </Button>
          <Button
            size="sm"
            icon={<Download size={16} />}
            onClick={() => setIsExportModalOpen(true)}
          >
            Exporter un rapport
          </Button>
        </div>
      </header>

      <div className="workspace-summary"><div><span>Votre tableau de suivi</span><strong>Chaque progrès compte.</strong></div><p>Données de démonstration · Les tendances et les simulations illustrent le fonctionnement de votre espace.</p></div>
      <div className="workspace-section-heading"><h2>Les indicateurs à suivre</h2><span>Gaspillage · Prévisions · Économies</span></div>

      <div className="analytics-grid">
        {/* Waste Stats */}
        <WasteChart stats={wasteStats} evolution={wasteEvolution} />

        {/* AI Performance */}
        <AITrendChart
          reliability={aiReliability}
          criticalProducts={criticalProducts}
          predictionCount={predictionCount}
        />

        {/* Total Usage (Chart) */}
        <SavingsChart evolution={savingsEvolution} />

        {/* ROI Simulator - Full width */}
        <div className="col-span-2">
          <ROISimulator />
        </div>
      </div>

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />

      <CustomizeAnalyticsModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        initialSettings={analyticsSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default Analytics;
