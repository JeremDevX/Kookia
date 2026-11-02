import { describe, expect, it } from "vitest";
import { baselineSourceLabels } from "./baselineSourceLabels";

describe("baseline source labels", () => {
  it("identifies scenario data rather than observed sales", () => {
    expect(baselineSourceLabels("demo_simulation")).toEqual({
      note: "Calcul fondé sur des données de scénario, sans ventes constatées. Les résultats restent des estimations à vérifier.",
      volume: "Volume du scénario",
    });
  });
  it("distinguishes recorded and mixed sources", () => {
    expect(baselineSourceLabels("recorded_sales")).toEqual({ note: "", volume: "Volume observé" });
    expect(baselineSourceLabels("mixed").note).toContain("hors bilan ne sont pas retenues");
  });
});
