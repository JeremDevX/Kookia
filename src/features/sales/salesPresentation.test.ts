import { describe, expect, it } from "vitest";
import { describeSalesMetricsSources, describeSalesMetricsTotalSource } from "./salesPresentation";

describe("sales metrics provenance copy", () => {
  it("keeps operational sales copy free of demonstration data when all sources are recorded", () => {
    expect(describeSalesMetricsSources("recorded_sales")).toMatch(/saisies manuelles/);
    expect(describeSalesMetricsSources("recorded_sales")).not.toMatch(/démonstration|simulées?/i);
    expect(describeSalesMetricsTotalSource(12, 0)).toBe("enregistrées");
  });

  it("keeps lines outside the recorded sales apart from recorded totals", () => {
    expect(describeSalesMetricsSources("demo_simulation")).toMatch(/aucune ligne.*vente enregistrée/i);
    expect(describeSalesMetricsSources("mixed")).toMatch(/séparées des ventes enregistrées/);
    expect(describeSalesMetricsTotalSource(12, 4)).toBe("enregistrées et hors bilan");
    expect(describeSalesMetricsTotalSource(12, 12)).toBe("hors bilan");
    expect(describeSalesMetricsSources("demo_simulation")).not.toMatch(/simul|démonstration/i);
  });
});
