import type { LatestService } from "../../services/salesService";

export const describeServiceSources = (sources: LatestService["sources"]): string => {
  if (sources.includes("csv") && sources.includes("manual")) return "import CSV et saisie manuelle";
  if (sources.includes("csv")) return "import CSV";
  if (sources.includes("manual")) return "saisie manuelle";
  return "source indisponible";
};
