import type { LatestService } from "../../services/salesService";

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
