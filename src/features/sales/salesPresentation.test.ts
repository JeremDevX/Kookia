import { describe, expect, it } from "vitest";
import { describeSalesMetricsSources, describeSalesMetricsTotalSource } from "./salesPresentation";

describe("sales metrics provenance copy", () => {
  it("keeps operational sales copy free of demonstration data when all sources are recorded", () => {
    expect(describeSalesMetricsSources("recorded_sales")).toMatch(/saisies manuelles/);
    expect(describeSalesMetricsSources("recorded_sales")).not.toMatch(/démonstration|simulées?/i);
    expect(describeSalesMetricsTotalSource(12, 0)).toBe("enregistrées");
  });

  it("discloses non-observed sales when demonstration provenance is present", () => {
    expect(describeSalesMetricsSources("demo_simulation")).toMatch(/ne sont pas des ventes observées/);
    expect(describeSalesMetricsSources("mixed")).toMatch(/séparées des ventes enregistrées/);
    expect(describeSalesMetricsTotalSource(12, 4)).toBe("enregistrées et simulées");
    expect(describeSalesMetricsTotalSource(12, 12)).toBe("simulées");
  });
});
