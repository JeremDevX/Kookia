import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import CustomizeAnalyticsModal from "../components/analytics/CustomizeAnalyticsModal";
import WasteChart from "../components/analytics/charts/WasteChart";
import AITrendChart from "../components/analytics/charts/AITrendChart";
import SavingsChart from "../components/analytics/charts/SavingsChart";
import ROISimulator from "../components/analytics/ROISimulator";
import { getInsights, type Insights } from "../services/insightsService";
import { useToast } from "../context/ToastContext";
import { useAnalytics } from "../hooks";
import type { AnalyticsSettings } from "../types/callbacks";
import { useAnalyticsPreferences } from "../features/analytics/useAnalyticsPreferences";
import "./InsightsSettings.css";

export default function DemoAnalytics() {
  const { addToast } = useToast();
  const { data, error, refetch } = useAnalytics();
  const { settings, saveSettings, error: preferencesError, loading: preferencesLoading } = useAnalyticsPreferences();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState("");

  useEffect(() => {
    let active = true;
    getInsights().then((result) => { if (active) setInsights(result); }, () => { if (active) setInsightsError("Hypothèses et indicateurs indisponibles."); });
    return () => { active = false; };
  }, []);

  const handleSave = async (next: AnalyticsSettings) => {
    try { await saveSettings(next); addToast("success", "Affichage enregistré", "Les réglages des graphiques ont été mis à jour."); }
    catch (cause) { addToast("info", "Enregistrement impossible", cause instanceof Error ? cause.message : "Réessayez."); throw cause; }
  };

  return <div className="bilan-demo-content">
    <p>Données figées au 11/09/2026, non recalculées à partir de votre activité. La simulation et la « performance IA » illustrent seulement des possibilités futures ; elles ne mesurent pas votre restaurant.</p>
    {preferencesError && <p role="alert">{preferencesError}</p>}
    {insightsError && <p role="alert">{insightsError}</p>}
    <Button variant="outline" size="sm" disabled={preferencesLoading} onClick={() => setCustomizeOpen(true)}>Régler les graphiques d'exemple</Button>
    {error ? <div role="alert"><p>{error.message}</p><Button onClick={() => void refetch()}>Réessayer</Button></div> : !data ? <p role="status">Chargement des graphiques…</p> :
      <div className="analytics-grid">
        <WasteChart stats={data.wasteStats} evolution={data.wasteEvolution} showTrends={settings.showTrends} targetGrams={preferencesLoading || preferencesError ? null : settings.wasteTarget} />
        {settings.showAI && <AITrendChart reliability={data.aiReliability} criticalProducts={data.criticalProducts} predictionCount={insights?.predictionCount ?? 0} />}
        {settings.showROI && <SavingsChart evolution={data.savingsEvolution} />}
        {settings.showROI && <div className="col-span-2">{insights ? <ROISimulator roiSimulator={insights.roi} /> : !insightsError && <p role="status">Chargement des hypothèses…</p>}</div>}
      </div>}
    <CustomizeAnalyticsModal isOpen={customizeOpen} onClose={() => setCustomizeOpen(false)} initialSettings={settings} onSave={handleSave} />
  </div>;
}
