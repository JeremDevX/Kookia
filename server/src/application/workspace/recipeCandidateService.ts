import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { createRecipeInTransaction, type RecipeValues } from "./recipeService.js";
import { sourceInvoiceDocumentSchema } from "./invoiceService.js";

export interface RecipeCandidateIngredientInput {
  productId: string;
  quantity: number;
  sourceDocumentId: string;
  sourceLineNumber: number;
}
export interface RecipeCandidateInput extends Omit<RecipeValues, "ingredients"> {
  ingredients: RecipeCandidateIngredientInput[];
}

const evidenceSchema = z.object({
  sourceDocumentId: z.string().regex(/^[a-f0-9]{24}$/), sourceDocumentRevision: z.number().int().nonnegative(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/), sourceTitle: z.string(), sourceDate: z.iso.date().nullable(),
  sourceLineNumber: z.number().int().positive(), sourceName: z.string(), sourceQuantityText: z.string(),
  sourceQuantity: z.number().positive(), sourceUnit: z.enum(["kg", "L", "pcs"]),
  sourceUnitPrice: z.number().nonnegative(), sourcePriceBasis: z.enum(["stated_unit_price", "derived_from_line_amount_ht", "derived_from_line_amount_ttc"]),
  sourceTaxBasis: z.enum(["HT", "TTC", "unknown"]),
});
const candidateIngredientSchema = z.object({ productId: z.string(), productName: z.string(), unit: z.string(), quantity: z.number().positive(),
  evidence: evidenceSchema }).strict();
const candidateDataSchema = z.object({ id: z.string().uuid(), status: z.enum(["pending", "confirmed", "rejected"]),
  recipeId: z.string().uuid().nullable(),
  recipe: z.object({ name: z.string(), category: z.enum(["Entrée", "Plat", "Dessert"]), prepTime: z.number().int(),
    yieldPortions: z.number().int(), effectiveFrom: z.iso.date() }).strict(),
  ingredients: z.array(candidateIngredientSchema).min(1),
}).strict();
const eventSchema = z.object({ candidateId: z.string().uuid(), request: z.unknown(), result: candidateDataSchema }).strict();
type CandidateData = z.infer<typeof candidateDataSchema>;
type CandidateDocument = { data: Prisma.JsonValue; revision: number; updatedAt: Date };

const candidateKind = (id: string) => `recipe-candidate:${id}`;
const snapshotJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const publicCandidate = (document: CandidateDocument) => ({ ...candidateDataSchema.parse(document.data),
  revision: document.revision, updatedAt: document.updatedAt.toISOString() });
const lockWorkspace = (tx: Prisma.TransactionClient, restaurantId: string) =>
  tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);

async function ensureDemo(tx: Prisma.TransactionClient, restaurantId: string) {
  const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
  if (!restaurant || restaurant.mode !== "demo")
    throw new WorkspaceError(409, "DEMO_ONLY", "Les fiches candidates sont réservées au bac de démonstration.");
}

async function getCandidateDocument(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const document = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: candidateKind(id) } } });
  if (!document) throw new WorkspaceError(404, "NOT_FOUND", "Fiche candidate introuvable dans cet espace.");
  candidateDataSchema.parse(document.data);
  return document;
}

async function priorResult(tx: Prisma.TransactionClient, restaurantId: string, operationId: string,
  decision: string, request: unknown) {
  const prior = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId } });
  if (!prior) return null;
  if (prior.decision !== decision) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération a déjà servi à une autre décision.");
  const saved = eventSchema.parse(prior.snapshot);
  if (!isDeepStrictEqual(saved.request, request))
    throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération de recette candidate a déjà été utilisée avec d’autres valeurs.");
  return publicCandidate(await getCandidateDocument(tx, restaurantId, saved.candidateId));
}

async function candidateDataFromInput(tx: Prisma.TransactionClient, restaurantId: string,
  id: string, input: RecipeCandidateInput, existing?: CandidateData): Promise<CandidateData> {
  if (new Set(input.ingredients.map((ingredient) => ingredient.productId)).size !== input.ingredients.length)
    throw new WorkspaceError(400, "DUPLICATE_RECIPE_INGREDIENT", "Un produit ne peut apparaître qu’une fois dans la fiche candidate.");
  if (new Set(input.ingredients.map((ingredient) => `${ingredient.sourceDocumentId}:${ingredient.sourceLineNumber}`)).size !== input.ingredients.length)
    throw new WorkspaceError(400, "DUPLICATE_SOURCE_LINE", "Une ligne de pièce ne peut pas justifier deux ingrédients de la même fiche.");

  const productIds = input.ingredients.map((ingredient) => ingredient.productId);
  const sourceIds = [...new Set(input.ingredients.map((ingredient) => ingredient.sourceDocumentId))];
  const [products, sourceDocuments] = await Promise.all([
    tx.product.findMany({ where: { restaurantId, id: { in: productIds } }, select: { id: true, name: true, unit: true } }),
    tx.workspaceDocument.findMany({ where: { restaurantId, kind: { in: sourceIds.map((sourceId) => `source-invoice:${sourceId}`) } } }),
  ]);
  if (products.length !== productIds.length) throw new WorkspaceError(400, "INVALID_RECIPE_PRODUCT", "Chaque ingrédient doit être un produit de votre espace.");
  if (sourceDocuments.length !== sourceIds.length) throw new WorkspaceError(404, "NOT_FOUND", "Une pièce source est introuvable dans cet espace.");
  const productById = new Map(products.map((product) => [product.id, product]));
  const sourceById = new Map(sourceDocuments.map((document) => {
    const source = sourceInvoiceDocumentSchema.parse(document.data);
    const sourceId = document.kind.slice("source-invoice:".length);
    if (source.id !== sourceId) throw new WorkspaceError(409, "SOURCE_CHANGED", "L’identifiant de la pièce ne correspond pas à sa référence archivée.");
    return [sourceId, { source, revision: document.revision }];
  }));
  const ingredients = input.ingredients.map((ingredient) => {
    const product = productById.get(ingredient.productId)!;
    if (!(ingredient.quantity > 0 && Number.isFinite(ingredient.quantity)) ||
        (product.unit === "pcs" && !Number.isInteger(ingredient.quantity)))
      throw new WorkspaceError(400, "INVALID_RECIPE_UNIT", "La quantité candidate doit respecter l’unité du produit.");
    const entry = sourceById.get(ingredient.sourceDocumentId);
    if (!entry) throw new WorkspaceError(404, "NOT_FOUND", "Une pièce source est introuvable dans cet espace.");
    if (entry.source.type !== "invoice") throw new WorkspaceError(409, "SOURCE_TYPE_NOT_RECEIVABLE", "Un avoir ou un bon de livraison ne peut pas appuyer une fiche candidate.");
    const line = entry.source.stockLines.find((candidate) => candidate.sourceLineNumber === ingredient.sourceLineNumber);
    if (!line) throw new WorkspaceError(404, "SOURCE_LINE_NOT_FOUND", "La ligne choisie n’existe plus dans cette pièce.");
    if (line.unit !== product.unit) throw new WorkspaceError(409, "SOURCE_UNIT_MISMATCH", `L’unité source de ${line.name} diffère de celle de ${product.name} ; aucune conversion n’est supposée.`);
    return { productId: product.id, productName: product.name, unit: product.unit, quantity: ingredient.quantity,
      evidence: { sourceDocumentId: entry.source.id, sourceDocumentRevision: entry.revision,
        sourceContentHash: entry.source.contentHash, sourceTitle: entry.source.title, sourceDate: entry.source.date,
        sourceLineNumber: line.sourceLineNumber, sourceName: line.name, sourceQuantityText: line.sourceQuantityText,
        sourceQuantity: line.quantity, sourceUnit: line.unit, sourceUnitPrice: line.unitPrice,
        sourcePriceBasis: line.priceBasis, sourceTaxBasis: line.priceTaxBasis } };
  });
  return candidateDataSchema.parse({ id, status: existing?.status ?? "pending", recipeId: existing?.recipeId ?? null,
    recipe: { name: input.name, category: input.category, prepTime: input.prepTime,
      yieldPortions: input.yieldPortions, effectiveFrom: input.effectiveFrom }, ingredients });
}

async function assertEvidenceCurrent(tx: Prisma.TransactionClient, restaurantId: string, candidate: CandidateData) {
  for (const ingredient of candidate.ingredients) {
    const { evidence } = ingredient;
    const document = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: {
      restaurantId, kind: `source-invoice:${evidence.sourceDocumentId}`,
    } } });
    if (!document || document.revision !== evidence.sourceDocumentRevision)
      throw new WorkspaceError(409, "SOURCE_CHANGED", "Une pièce source a changé ; rechargez la fiche candidate avant confirmation.");
    const source = sourceInvoiceDocumentSchema.parse(document.data);
    if (source.contentHash !== evidence.sourceContentHash || source.type !== "invoice" ||
        !source.stockLines.some((line) => line.sourceLineNumber === evidence.sourceLineNumber && line.name === evidence.sourceName))
      throw new WorkspaceError(409, "SOURCE_CHANGED", "La ligne source ne correspond plus à la preuve enregistrée.");
  }
}

async function recordEvent(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, operationId: string,
  decision: string, request: unknown, result: CandidateData) {
  await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId, decision,
    snapshot: snapshotJson({ candidateId: result.id, request, result }) } });
}

export async function getRecipeCandidates(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
  if (!restaurant || restaurant.mode !== "demo") return { available: false as const, candidates: [] };
  const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "recipe-candidate:" } },
    orderBy: [{ updatedAt: "desc" }, { kind: "asc" }] });
  return { available: true as const, candidates: documents.map(publicCandidate) };
}

export async function createRecipeCandidate(restaurantId: string, actorId: string, operationId: string, input: RecipeCandidateInput) {
  return prisma.$transaction(async (tx) => {
    await lockWorkspace(tx, restaurantId);
    await ensureDemo(tx, restaurantId);
    const replay = await priorResult(tx, restaurantId, operationId, "recipe_candidate_created", input);
    if (replay) return replay;
    const id = randomUUID();
    const candidate = await candidateDataFromInput(tx, restaurantId, id, input);
    const document = await tx.workspaceDocument.create({ data: { restaurantId, kind: candidateKind(id), revision: 1,
      data: snapshotJson(candidate) } });
    await recordEvent(tx, restaurantId, actorId, operationId, "recipe_candidate_created", input, candidate);
    return publicCandidate(document);
  });
}

export async function updateRecipeCandidate(restaurantId: string, actorId: string, id: string, expectedRevision: number,
  operationId: string, input: RecipeCandidateInput) {
  return prisma.$transaction(async (tx) => {
    await lockWorkspace(tx, restaurantId);
    await ensureDemo(tx, restaurantId);
    const request = { candidateId: id, expectedRevision, input };
    const replay = await priorResult(tx, restaurantId, operationId, "recipe_candidate_saved", request);
    if (replay) return replay;
    const document = await getCandidateDocument(tx, restaurantId, id);
    const existing = candidateDataSchema.parse(document.data);
    if (existing.status !== "pending") throw new WorkspaceError(409, "CANDIDATE_FINAL", "Une fiche confirmée ou écartée ne peut plus être modifiée.");
    if (document.revision !== expectedRevision) throw new WorkspaceError(409, "REVISION_CONFLICT", "La fiche candidate a changé ; rechargez-la avant de poursuivre.");
    const candidate = await candidateDataFromInput(tx, restaurantId, id, input, existing);
    const saved = await tx.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId, kind: candidateKind(id) } },
      data: { data: snapshotJson(candidate), revision: { increment: 1 } } });
    await recordEvent(tx, restaurantId, actorId, operationId, "recipe_candidate_saved", request, candidate);
    return publicCandidate(saved);
  });
}

export async function decideRecipeCandidate(restaurantId: string, actorId: string, id: string, expectedRevision: number,
  operationId: string, action: "confirm" | "reject") {
  return prisma.$transaction(async (tx) => {
    await lockWorkspace(tx, restaurantId);
    await ensureDemo(tx, restaurantId);
    const request = { candidateId: id, expectedRevision, action };
    const decision = action === "confirm" ? "recipe_candidate_confirmed" : "recipe_candidate_rejected";
    const replay = await priorResult(tx, restaurantId, operationId, decision, request);
    if (replay) return replay;
    const document = await getCandidateDocument(tx, restaurantId, id);
    const existing = candidateDataSchema.parse(document.data);
    if (existing.status !== "pending") throw new WorkspaceError(409, "CANDIDATE_FINAL", "Cette fiche candidate a déjà été confirmée ou écartée.");
    if (document.revision !== expectedRevision) throw new WorkspaceError(409, "REVISION_CONFLICT", "La fiche candidate a changé ; rechargez-la avant de poursuivre.");
    let recipeId: string | null = null;
    if (action === "confirm") {
      await assertEvidenceCurrent(tx, restaurantId, existing);
      const recipe = await createRecipeInTransaction(tx, restaurantId, actorId, operationId, {
        ...existing.recipe, ingredients: existing.ingredients.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      recipeId = recipe.id;
    }
    const candidate = candidateDataSchema.parse({ ...existing, status: action === "confirm" ? "confirmed" : "rejected",
      recipeId });
    const saved = await tx.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId, kind: candidateKind(id) } },
      data: { data: snapshotJson(candidate), revision: { increment: 1 } } });
    await recordEvent(tx, restaurantId, actorId, operationId, decision, request, candidate);
    return publicCandidate(saved);
  });
}
