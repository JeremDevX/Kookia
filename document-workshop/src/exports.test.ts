import { expect, it } from "vitest";
import { createDocuments } from "./documents";
import { pdfBytes } from "./exports";
import { layoutDocument } from "./layout";
import { generateScenario } from "./scenario";
import { workshopOptions } from "./testFixtures";

it("preserves French names and punctuation in the preview and downloaded PDF", () => {
  const scenario = generateScenario({ ...workshopOptions, days: 1, name: "L’Œuvre — Cafe\u0301 du Cœur" });
  const identity = createDocuments(scenario).docs.find(doc => doc.kind === "identity")!;

  expect(layoutDocument(identity).flatMap(page => page.runs.map(run => run.text)))
    .toContain("Émetteur : L’Œuvre — Café du Cœur");
  expect(new TextDecoder().decode(pdfBytes(identity)))
    .toContain(String.raw`(\311metteur : L\222\214uvre \227 Caf\351 du C\234ur) Tj`);
});
