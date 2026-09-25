import type { RecommendationDecision, RecipeVersion } from "@prisma/client";
import { expect, it } from "vitest";
import { decisionEvent, versionEvent } from "./timelineEventMappers.js";

const createdAt = new Date("2026-09-24T10:00:00.000Z");

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
    kind: "decision", label: "Candidate confirmée comme recette dans le bac de démonstration",
    detail: expect.stringContaining("« Hypothèse — pizza jambon et champignons » · état : confirmed"),
    provenance: "simulation", href: "/recipes",
    qualifier: expect.stringContaining("aucune cuisson n’est déclarée"),
  });

  const version: RecipeVersion = { id: "version-id", restaurantId: "restaurant-id", recipeId: "recipe-id",
    version: 1, effectiveFrom: createdAt, operationId: "recipe-operation", actorId: "owner-id",
    name: "Hypothèse — pizza jambon et champignons", category: "Plat", prepTime: 20, yieldPortions: 4, createdAt };
  expect(versionEvent(version, "demo")).toMatchObject({ kind: "recipe", provenance: "simulation",
    qualifier: expect.stringContaining("n’atteste pas une recette réellement pratiquée") });
});
