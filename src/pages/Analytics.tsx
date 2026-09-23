import React, { useState, useEffect } from "react";
import Button from "../components/common/Button";
import ExportReportModal from "../components/analytics/ExportReportModal";
import CustomizeAnalyticsModal from "../components/analytics/CustomizeAnalyticsModal";
import WasteChart from "../components/analytics/charts/WasteChart";
import AITrendChart from "../components/analytics/charts/AITrendChart";
import SavingsChart from "../components/analytics/charts/SavingsChart";
import { Download } from "lucide-react";
import { getInsights, type Insights } from "../services/insightsService";
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
  const { data, error, refetch } = useAnalytics();
  const { settings: analyticsSettings, saveSettings, error: preferencesError, loading: preferencesLoading } =
    useAnalyticsPreferences();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const handleSaveSettings = async (settings: AnalyticsSettings) => {
    try {
      await saveSettings(settings);
      addToast(
        "success",
        "Affichage enregistré",
        "Les réglages des analyses ont été mis à jour."
      );
    } catch (error) {
      addToast(
        "info",
        "Enregistrement impossible",
        error instanceof Error
          ? error.message
          : "Réessayez."
      );
      throw error;
    }
  };

  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState("");
  useEffect(() => {
    let active = true;
    getInsights().then((data) => { if (active) setInsights(data); }, () => { if (active) setInsightsError("Hypothèses et indicateurs indisponibles."); });
    return () => { active = false; };
  }, []);
  const predictionCount = insights?.predictionCount ?? 0;

  if (error) return <div role="alert"><p>{error.message}</p><Button onClick={() => void refetch()}>Réessayer</Button></div>;

  if (!data) {
    return (
      <div className="analytics-container workspace-page" role="status">
        <header className="page-header glass-header">
          <div>
            <h1 className="page-title">Analyses</h1>
            <p className="page-subtitle">Chargement des analyses…</p>
          </div>
        </header>
      </div>
    );
  }

  const { wasteStats, aiReliability, wasteEvolution, savingsEvolution, criticalProducts } =
    data;

  return (
    <div className="analytics-container workspace-page">
      {insightsError && <p role="alert">{insightsError}</p>}
      {preferencesError && <p role="alert">{preferencesError}</p>}
      <header className="workspace-header">
        <div>
          <h1>Analyses</h1>
        </div>
        <div className="flex gap-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizeModalOpen(true)}
            disabled={preferencesLoading}
          >
            Régler l’affichage
          </Button>
          <Button
            size="sm"
            icon={<Download size={16} />}
            onClick={() => setIsExportModalOpen(true)}
          >
            Exporter les données
          </Button>
        </div>
      </header>

      <div className="workspace-summary"><div><span>Source</span><strong>Données d’exemple</strong></div><p>Chiffres figés au 11/09/2026, non recalculés à partir de votre activité.</p></div>
      <div className="workspace-section-heading"><h2>Indicateurs</h2></div>

      <div className="analytics-grid">
        {/* Waste Stats */}
        <WasteChart stats={wasteStats} evolution={wasteEvolution} showTrends={analyticsSettings.showTrends} targetGrams={preferencesLoading || preferencesError ? null : analyticsSettings.wasteTarget} />

        {/* AI Performance */}
        {analyticsSettings.showAI && <AITrendChart
          reliability={aiReliability}
          criticalProducts={criticalProducts}
          predictionCount={predictionCount}
        />}

        {/* Total Usage (Chart) */}
        {analyticsSettings.showROI && <SavingsChart evolution={savingsEvolution} />}

        {/* ROI Simulator - Full width */}
        {analyticsSettings.showROI && <div className="col-span-2">
          {insights ? <ROISimulator roiSimulator={insights.roi} /> : !insightsError && <p role="status">Chargement des hypothèses…</p>}
        </div>}
      </div>

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
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
