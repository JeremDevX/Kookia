import type { SalesBaseline as Baseline } from "../../services/salesService";

export function baselineSourceLabels(provenance: Baseline["provenance"], clientPresentation = false) {
  if (clientPresentation && provenance === "demo_simulation") return { note: "Estimations calculées à partir de l’historique disponible.", volume: "Volume de référence" };
  if (clientPresentation && provenance === "mixed") return { note: "Certaines lignes sont exclues du calcul et du calendrier de service.", volume: "Volume observé" };
  return provenance === "demo_simulation"
    ? { note: "Calcul fondé sur des données de scénario, sans ventes constatées. Les résultats restent des estimations à vérifier.", volume: "Volume du scénario" }
    : { note: provenance === "mixed" ? "Certaines lignes hors bilan ne sont pas retenues dans le calcul et ne complètent pas le calendrier de service." : "", volume: "Volume observé" };
}

