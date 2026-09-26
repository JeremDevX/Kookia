import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import DeclaredWastePanel from "./DeclaredWastePanel";
it("explains declared units, no double deduction and absence of inferred monetary impact", () => {
  const html = renderToStaticMarkup(createElement(DeclaredWastePanel, { summary: { records: [], totals: [{ kind: "preparation", avoidability: "inedible", unit: "kg", quantity: 0.5, recordCount: 1 }, { kind: "unsold", avoidability: "avoidable", unit: "portion", quantity: 2, recordCount: 1 }], excludedSimulationCount: 0 } }));
  expect(html).toContain("0,5 kg"); expect(html).toContain("2 portion"); expect(html).toContain("non comestible");
  expect(html).toContain("ne déduisent pas à nouveau"); expect(html).toContain("Aucune estimation"); expect(html).toContain("ne signifie pas zéro"); expect(html).toContain("Aucun coût des préparations");
});
