import type { LatestService, SalesMetrics } from "../../services/salesService";

const coverageLabels: Record<LatestService["coverage"], string> = {
  complete: "Complète", partial: "Partielle", missing: "Manquante",
};

export const describeServiceCoverage = (coverage: LatestService["coverage"]): string => coverageLabels[coverage];

export const describeServiceSources = (sources: LatestService["sources"], clientPresentation: boolean): string | null => {
  const labels = [
    ...(!clientPresentation && sources.includes("demo_simulation") ? ["hors bilan"] : []),
    ...(sources.includes("pos") ? ["caisse POS"] : []),
    ...(sources.includes("ticket_z") ? ["ticket de caisse"] : []),
    ...(sources.includes("csv") ? ["import CSV"] : []),
    ...(sources.includes("manual") ? ["saisie manuelle"] : []),
  ];
  if (labels.length) return labels.join(", ");
  return clientPresentation ? null : "source indisponible";
};

export const describeSalesMetricsSources = (provenance: SalesMetrics["provenance"], clientPresentation = false): string => {
  if (provenance === "demo_simulation") return "Aucune ligne de cette période n’est retenue comme vente enregistrée.";
  if (provenance === "mixed" && clientPresentation) return "Certaines lignes sont exclues du calcul des ventes et du calendrier de service.";
  if (provenance === "mixed") return "Les lignes hors bilan restent séparées des ventes enregistrées et ne complètent pas l’historique de service.";
  return "Sources : saisies manuelles, imports CSV, tickets de caisse vérifiés ou lignes POS confirmées.";
};

export const describeSalesMetricsTotalSource = (totalQuantity: number, demoSimulationQuantity: number): string => {
  if (demoSimulationQuantity <= 0) return "enregistrées";
  return demoSimulationQuantity < totalQuantity ? "enregistrées et hors bilan" : "hors bilan";
};
