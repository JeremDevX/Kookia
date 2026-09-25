import { expect, it } from "vitest";
import { sourceInvoiceContentForWorkspace } from "./invoiceService.js";

it("exposes only the working date in a source invoice transcription", () => {
  const content = [
    "# Fournisseur — facture",
    "- Date décalée de la pièce (démonstration) : 2026-09-23",
    "- Date (pièce d’origine) : 1999-01-01",
    "- Fournisseur : Fournisseur",
  ].join("\n");

  const visibleContent = sourceInvoiceContentForWorkspace(content, "2026-09-23");

  expect(visibleContent).toContain("- Date de travail : 2026-09-23");
  expect(visibleContent).not.toContain("1999-01-01");
  expect(visibleContent).not.toContain("démonstration");
});
