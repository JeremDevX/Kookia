import { apiRequest } from "../config/api";
import type { Recipe } from "../types";

export interface RecipeCandidateIngredient {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  evidence: {
    sourceDocumentId: string;
    sourceDocumentRevision: number;
    sourceContentHash: string;
    sourceTitle: string;
    sourceDate: string | null;
    sourceLineNumber: number;
    sourceName: string;
    sourceQuantityText: string;
    sourceQuantity: number;
    sourceUnit: string;
    sourceUnitPrice: number;
    sourcePriceBasis: string;
    sourceTaxBasis: "HT" | "TTC" | "unknown";
  };
}

export interface RecipeCandidateRecipe {
  name: string;
  category: Recipe["category"];
  prepTime: number;
  yieldPortions: number;
  effectiveFrom: string;
}

export interface RecipeCandidate {
  id: string;
  status: "pending" | "confirmed" | "rejected";
  recipeId: string | null;
  recipe: RecipeCandidateRecipe;
  ingredients: RecipeCandidateIngredient[];
  revision: number;
  updatedAt: string;
}

export interface RecipeCandidateInput {
  name: string;
  category: Recipe["category"];
  prepTime: number;
  yieldPortions: number;
  effectiveFrom: string;
  ingredients: Array<Pick<RecipeCandidateIngredient, "productId" | "quantity"> & {
    sourceDocumentId: string;
    sourceLineNumber: number;
  }>;
}

export const getRecipeCandidates = () => apiRequest<{ available: boolean; candidates: RecipeCandidate[] }>("/workspace/recipe-candidates");
export const createRecipeCandidate = (operationId: string, input: RecipeCandidateInput) =>
  apiRequest<RecipeCandidate>("/workspace/recipe-candidates", { method: "POST", body: JSON.stringify({ ...input, operationId }) });
export const updateRecipeCandidate = (id: string, expectedRevision: number, operationId: string, input: RecipeCandidateInput) =>
  apiRequest<RecipeCandidate>("/workspace/recipe-candidates/" + id, {
    method: "PATCH", body: JSON.stringify({ ...input, expectedRevision, operationId }),
  });
export const decideRecipeCandidate = (id: string, expectedRevision: number, operationId: string, action: "confirm" | "reject") =>
  apiRequest<RecipeCandidate>("/workspace/recipe-candidates/" + id + "/decision", {
    method: "POST", body: JSON.stringify({ operationId, expectedRevision, action }),
  });
