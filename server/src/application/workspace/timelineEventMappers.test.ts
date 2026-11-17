import { Prisma, type RecommendationDecision, type RecipeVersion } from "@prisma/client";
import { expect, it } from "vitest";
import { decisionEvent, documentEvent, stockEvent, versionEvent } from "./timelineEventMappers.js";

const createdAt = new Date("2026-09-24T10:00:00.000Z");

it("keeps archive metadata, documentary confirmations, and simulated invoice effects distinct", () => {
  const row = { kind: "invoice:some-invoice", knownAt: createdAt, sourceDate: "2026-09-24", title: "Facture",
    supplier: null, documentType: null, status: "received", provenance: null, stockEffect: null, lineCount: 1 };
  expect(documentEvent(row, "demo").provenance).toBe("simulation");
  expect(documentEvent({ ...row, stockEffect: "demo_simulation" }, "operational").provenance).toBe("simulation");
  expect(documentEvent({ ...row, kind: "source-invoice:archive" }, "demo").provenance).toBe("source");
  expect(documentEvent({ ...row, kind: "invoice:source:archive", provenance: "demo_simulation", stockEffect: "none" },
    "operational")).toMatchObject({ label: "Pièce d’archive confirmée", provenance: "simulation",
    qualifier: expect.stringContaining("Confirmation documentaire uniquement") });
});

it("distinguishes credited archive stock from reference lines and other movements excluded from the bilan", () => {
  const movement: Parameters<typeof stockEvent>[0] = {
    id: "movement", restaurantId: "restaurant", createdAt, productId: "flour",
    delta: new Prisma.Decimal(2), serviceSlot: null, reason: "invoice_import_demo",
    operationId: "restaurant-simulation-v1:invoice:archive:1:flour", actorId: "owner",
    sourceDocumentId: "archive", sourceContentHash: null, sourceDocumentRevision: 1,
    invoiceDocumentId: "source:archive", invoiceRevision: 3, stockCountId: null,
    productNameSnapshot: "Farine", productUnitSnapshot: "kg", supplierNameSnapshot: null, unitPriceSnapshot: null,
    purchaseReceiptLineId: null, purchaseReceiptLine: null,
  };
  expect(stockEvent(movement)).toMatchObject({ provenance: "simulation", label: "Crédit de stock d’archive validé",
    qualifier: "Crédit appliqué au stock de travail et exclu du bilan des livraisons." });
  expect(stockEvent({ ...movement, invoiceDocumentId: null, invoiceRevision: null }))
    .toMatchObject({ provenance: "simulation", label: "Entrée issue d’une transcription" });
  expect(stockEvent({ ...movement, reason: "simulation_opening" }).provenance).toBe("assumption");
  expect(stockEvent({ ...movement, reason: "receipt", operationId: "simulated-invoice:some-invoice" }).provenance).toBe("simulation");
  expect(stockEvent({ ...movement, reason: "receipt", operationId: "receipt-operation",
    purchaseReceiptLine: { receipt: { simulated: false, provenance: "demo_simulation" } } }).provenance).toBe("simulation");
});

const candidateDecision = (decision: string): RecommendationDecision => ({
  id: "decision-id", restaurantId: "restaurant-id", actorId: "demo-seed:recipe-ideas:v3", predictionId: null,
  operationId: "candidate-operation", decision, createdAt,
  snapshot: { workspaceMode: "demo", candidateId: "candidate-id", request: {}, result: {
    id: "candidate-id", status: decision === "recipe_candidate_confirmed" ? "confirmed" : "pending",
    recipeId: null, recipe: { name: "Hypothèse — pizza jambon et champignons" }, ingredients: [],
  } },
});

it("labels demo recipe decisions and versions as hypothetical, never as production", () => {
  expect(decisionEvent(candidateDecision("recipe_candidate_confirmed"))).toMatchObject({
    kind: "decision", label: "Fiche de recette candidate confirmée",
    detail: expect.stringContaining("« Hypothèse — pizza jambon et champignons » · état : confirmed"),
    provenance: "simulation", href: "/recipes",
    qualifier: "Fiche de recette confirmée ; aucune cuisson n’est déclarée.",
  });
  expect(decisionEvent(candidateDecision("recipe_candidate_saved")).qualifier)
    .toBe("Proposition de recette à valider ; aucune cuisson n’est déclarée.");
  const version: RecipeVersion = { id: "version-id", restaurantId: "restaurant-id", recipeId: "recipe-id",
    version: 1, effectiveFrom: createdAt, operationId: "recipe-operation", actorId: "owner-id",
    name: "Hypothèse — pizza jambon et champignons", category: "Plat", prepTime: 20, yieldPortions: 4, steps: [], createdAt };
  expect(versionEvent(version, "demo")).toMatchObject({ kind: "recipe", provenance: "simulation",
    qualifier: expect.stringContaining("à confirmer comme recette pratiquée") });
});

it("keeps purchase decisions navigable without replaying them", () => {
  const decision: RecommendationDecision = {
    id: "849cb419-d2fd-4f8e-9835-686d11ebdf0c", restaurantId: "restaurant-id", actorId: "owner-id",
    predictionId: null, operationId: "purchase-operation", decision: "purchase_suggestion_added", createdAt,
    snapshot: {
      suggestionKey: "a".repeat(64), productId: "p1", quantity: 2,
      provenance: "demo_simulation", workspaceMode: "demo", model: "baseline-v1",
      asOfDate: "2026-09-23", forecastDate: "2026-09-25",
      suggestion: {
        suggestionKey: "a".repeat(64), productId: "p1", productName: "Farine T55", unit: "kg",
        status: "ready", canAdd: true,
        forecastNeed: 2, countedStock: 0, countDate: "2026-09-23", estimatedQuantity: 2,
        currentUnitPrice: 3.25, estimatedCost: 6.5, reason: "Besoin du prochain service.",
      },
    },
  };
  expect(decisionEvent(decision)).toMatchObject({ provenance: "simulation", href: "/orders#selection" });
  expect(decisionEvent(decision)).not.toHaveProperty("replayDecisionId");
  expect(decisionEvent({ ...decision, decision: "service_menu_saved", snapshot: {} }, "demo").provenance).toBe("simulation");
});

it("keeps the reviewed incoming-stock source on a newly created recipe decision", () => {
  const decision: RecommendationDecision = {
    id: "recipe-source-decision", restaurantId: "restaurant-id", actorId: "owner-id", predictionId: null,
    operationId: "recipe-source-operation", decision: "recipe_created_from_receipt_estimate", createdAt,
    snapshot: { source: { receiptLineId: "receipt-line-id", receiptId: "receipt-id", reference: "BL-2026-09",
      deliveryDate: "2026-09-24", productId: "product-id", productName: "Crème fraîche", receivedQuantity: 3, unit: "L" },
      recipe: { name: "Sauce à la crème", effectiveFrom: "2026-09-24" } },
  };
  expect(decisionEvent(decision)).toMatchObject({
    label: "Recette créée après revue d’une entrée reçue",
    detail: "« Sauce à la crème » · Crème fraîche · livraison BL-2026-09 · 3 L",
    provenance: "recorded", href: "/recipes",
    qualifier: expect.stringContaining("aucune vente, perte ou sortie de stock"),
  });
});
