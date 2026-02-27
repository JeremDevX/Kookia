import React, { useEffect, useState } from "react";
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
import {
  DEFAULT_ANALYTICS_SETTINGS,
  getAnalyticsPreferences,
  saveAnalyticsPreferences,
} from "../services";
import "./Analytics.css";

const Analytics: React.FC = () => {
  const { addToast } = useToast();
  const { data } = useAnalytics();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings>(
    DEFAULT_ANALYTICS_SETTINGS
  );

  useEffect(() => {
    const loadAnalyticsPreferences = async () => {
      const settings = await getAnalyticsPreferences();
      setAnalyticsSettings(settings);
    };

    void loadAnalyticsPreferences();
  }, []);

  const handleExport = (format: string, period: string) => {
    addToast(
      "success",
      "Rapport généré",
      `Rapport AGEC ${period} exporté en ${format.toUpperCase()}. Téléchargement en cours...`
    );
  };

  const handleSaveSettings = async (settings: AnalyticsSettings) => {
    try {
      await saveAnalyticsPreferences(settings);
      setAnalyticsSettings(settings);
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
      <div className="analytics-container">
        <header className="page-header glass-header">
          <div>
            <h1 className="page-title">Analytics & Gaspillage</h1>
            <p className="page-subtitle">Chargement des donnees analytics...</p>
          </div>
        </header>
      </div>
    );
  }

  const { wasteStats, aiReliability, wasteEvolution, savingsEvolution, criticalProducts } =
    data;

  return (
    <div className="analytics-container">
      <header className="page-header glass-header">
        <div>
          <h1 className="page-title">Analytics & Gaspillage</h1>
          <p className="page-subtitle">Suivi des performances et du ROI</p>
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
            Rapport AGEC 2025
          </Button>
        </div>
      </header>

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
