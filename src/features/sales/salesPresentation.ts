import type { LatestService } from "../../services/salesService";

export const describeServiceSources = (sources: LatestService["sources"]): string => {
  const labels = [
    ...(sources.includes("demo_simulation") ? ["simulation de démonstration"] : []),
    ...(sources.includes("pos") ? ["caisse POS"] : []),
    ...(sources.includes("csv") ? ["import CSV"] : []),
    ...(sources.includes("manual") ? ["saisie manuelle"] : []),
  ];
  if (labels.length) return labels.join(", ");
  return "source indisponible";
};
