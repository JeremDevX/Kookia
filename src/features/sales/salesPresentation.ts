import type { LatestService, SalesMetrics } from "../../services/salesService";

const coverageLabels: Record<LatestService["coverage"], string> = {
  complete: "Complète", partial: "Partielle", missing: "Manquante",
};

export const describeServiceCoverage = (coverage: LatestService["coverage"]): string => coverageLabels[coverage];

export const describeServiceSources = (sources: LatestService["sources"]): string => {
  const labels = [
    ...(sources.includes("demo_simulation") ? ["simulation de démonstration"] : []),
    ...(sources.includes("pos") ? ["caisse POS"] : []),
    ...(sources.includes("ticket_z") ? ["ticket de caisse"] : []),
    ...(sources.includes("csv") ? ["import CSV"] : []),
    ...(sources.includes("manual") ? ["saisie manuelle"] : []),
  ];
  if (labels.length) return labels.join(", ");
  return "source indisponible";
};

export const describeSalesMetricsSources = (provenance: SalesMetrics["provenance"]): string => {
  if (provenance === "demo_simulation") return "Ces données de démonstration ne sont pas des ventes observées.";
  if (provenance === "mixed") return "Les données de démonstration restent séparées des ventes enregistrées et ne sont pas des ventes observées.";
  return "Sources : saisies manuelles, imports CSV, tickets de caisse vérifiés ou lignes POS confirmées.";
};

export const describeSalesMetricsTotalSource = (totalQuantity: number, demoSimulationQuantity: number): string => {
  if (demoSimulationQuantity <= 0) return "enregistrées";
  return demoSimulationQuantity < totalQuantity ? "enregistrées et simulées" : "simulées";
};
