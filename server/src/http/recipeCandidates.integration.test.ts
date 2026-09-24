import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { createDemoRecipeIdeaSourceInvoices } from "../scripts/fixtures/demoRecipeIdeaSourceInvoices.js";
import type { SourceInvoice } from "../scripts/sourceInvoices.js";

const users: string[] = [];
type Agent = ReturnType<typeof request.agent>;
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

async function account(label: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: `${label} test`,
    email: `${label}-${randomUUID()}@example.com`, password: "recipe candidate integration password" }).expect(201);
  users.push(response.body.user.id);
  const catalog = await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id }, include: { restaurant: true } });
  return { agent, restaurantId: user.restaurant!.id, supplierId: catalog.body.suppliers[0].id as string };
}

async function product(agent: Agent, supplierId: string, name: string, unit: "kg" | "L") {
  return (await agent.post("/api/workspace/products").send({ operationId: randomUUID(), name, category: "Fixture",
    currentStock: 0, unit, minThreshold: 0, supplierId, pricePerUnit: 2 }).expect(201)).body as { id: string };
}

async function sourceInvoice(restaurantId: string, name: string, unit: "kg" | "L", type: "invoice" | "credit" = "invoice") {
  const id = randomUUID().replaceAll("-", "").slice(0, 24);
  const contentHash = createHash("sha256").update(`synthetic-candidate-source-${id}`).digest("hex");
  const invoice = { id, contentHash, title: `Pièce synthétique ${name}`, date: "2026-09-01", originalDate: null,
    supplier: "Fournisseur synthétique", type, status: "Fixture fictive, à confirmer",
    content: "Pièce entièrement synthétique, créée uniquement pour un test isolé.",
    stockLines: [{ name, quantity: 10, unit, unitPrice: 2, sourceQuantityText: `10 ${unit}`,
      sourceLineNumber: 4, priceBasis: "stated_unit_price", priceTaxBasis: "HT" }] };
  await prisma.workspaceDocument.create({ data: { restaurantId, kind: `source-invoice:${id}`,
    data: invoice as unknown as Prisma.InputJsonValue } });
  return { id, contentHash };
}

async function persistSourceInvoice(restaurantId: string, source: SourceInvoice) {
  const data: Prisma.InputJsonObject = { id: source.id, contentHash: source.contentHash, title: source.title,
    date: source.date, originalDate: source.originalDate, supplier: source.supplier, type: source.type,
    status: source.status, content: source.content, stockLines: source.stockLines.map((line) => ({
      name: line.name, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice,
      sourceQuantityText: line.sourceQuantityText, sourceLineNumber: line.sourceLineNumber,
      priceBasis: line.priceBasis, priceTaxBasis: line.priceTaxBasis,
    })) };
  await prisma.workspaceDocument.create({ data: { restaurantId, kind: `source-invoice:${source.id}`, data } });
  return { id: source.id, contentHash: source.contentHash };
}

const todayParis = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
function candidate(name: string, productId: string, sourceDocumentId: string, unit: string, sourceLineNumber = 4) {
  return { name, category: "Plat", prepTime: 20, yieldPortions: 4, effectiveFrom: todayParis(),
    ingredients: [{ productId, quantity: unit === "L" ? 0.4 : 0.6, sourceDocumentId, sourceLineNumber }] };
}

it("keeps recipe candidates hypothetical until an atomic, stock-neutral confirmation", async () => {
  const demo = await account("candidate-demo");
  const other = await account("candidate-other");
  await prisma.restaurant.update({ where: { id: demo.restaurantId }, data: { mode: "demo" } });
  await prisma.restaurant.update({ where: { id: other.restaurantId }, data: { mode: "demo" } });
  const mushrooms = await product(demo.agent, demo.supplierId, "Champignons", "kg");
  const cream = await product(demo.agent, demo.supplierId, "Crème Fraîche", "L");
  const ideaSources = createDemoRecipeIdeaSourceInvoices();
  const mushroomInvoice = ideaSources.find((source) => source.stockLines[0]?.name === "Champignons");
  const creamInvoice = ideaSources.find((source) => source.stockLines[0]?.name === "Crème Fraîche");
  if (!mushroomInvoice || !creamInvoice) throw new Error("Les deux familles synthétiques de recette sont requises.");
  const mushroomSource = await persistSourceInvoice(demo.restaurantId, mushroomInvoice);
  const creamSource = await persistSourceInvoice(demo.restaurantId, creamInvoice);
  const creditSource = await sourceInvoice(demo.restaurantId, "Avoir champignons", "kg", "credit");

  expect(await other.agent.get("/api/workspace/recipe-candidates").expect(200).then((response) => response.body))
    .toEqual({ available: true, candidates: [] });
  const stockBefore = await prisma.product.findMany({ where: { restaurantId: demo.restaurantId },
    select: { id: true, currentStock: true, stockRevision: true } });
  const movementCountBefore = await prisma.stockMovement.count({ where: { restaurantId: demo.restaurantId } });
  const productionCountBefore = await prisma.production.count({ where: { restaurantId: demo.restaurantId } });

  const first = await demo.agent.post("/api/workspace/recipe-candidates").send({ ...candidate("Poêlée hypothétique",
    mushrooms.id, mushroomSource.id, "kg", mushroomInvoice.stockLines[0].sourceLineNumber), operationId: randomUUID() }).expect(201);
  const second = await demo.agent.post("/api/workspace/recipe-candidates").send({ ...candidate("Sauce hypothétique",
    cream.id, creamSource.id, "L", creamInvoice.stockLines[0].sourceLineNumber), operationId: randomUUID() }).expect(201);
  expect(first.body).toMatchObject({ status: "pending", revision: 1, recipeId: null,
    ingredients: [{ productId: mushrooms.id, evidence: { sourceDocumentId: mushroomSource.id,
      sourceDocumentRevision: 0, sourceLineNumber: 4, sourceName: "Champignons", sourceUnit: "kg" } }] });
  expect(second.body).toMatchObject({ status: "pending", recipeId: null,
    recipe: { yieldPortions: 4 },
    ingredients: [{ productId: cream.id, evidence: { sourceDocumentId: creamSource.id,
      sourceLineNumber: 5, sourceName: "Crème Fraîche", sourceUnit: "L" } }] });

  await demo.agent.post("/api/workspace/recipe-candidates").send({ ...candidate("Avoir non recevable",
    mushrooms.id, creditSource.id, "kg"), operationId: randomUUID() }).expect(409)
    .expect(({ body }) => expect(body.error.code).toBe("SOURCE_TYPE_NOT_RECEIVABLE"));
  const foreignProduct = await product(other.agent, other.supplierId, "Produit autre tenant", "kg");
  await demo.agent.post("/api/workspace/recipe-candidates").send({ ...candidate("Produit croisé",
    foreignProduct.id, mushroomSource.id, "kg"), operationId: randomUUID() }).expect(400)
    .expect(({ body }) => expect(body.error.code).toBe("INVALID_RECIPE_PRODUCT"));

  const correctionOperation = randomUUID();
  const corrected = await demo.agent.patch(`/api/workspace/recipe-candidates/${first.body.id}`).send({
    ...candidate("Poêlée corrigée", mushrooms.id, mushroomSource.id, "kg"),
    ingredients: [{ productId: mushrooms.id, quantity: 0.5, sourceDocumentId: mushroomSource.id, sourceLineNumber: 4 }],
    expectedRevision: 1, operationId: correctionOperation,
  }).expect(200);
  expect(corrected.body).toMatchObject({ status: "pending", revision: 2, recipe: { name: "Poêlée corrigée" },
    ingredients: [{ quantity: 0.5 }] });

  const confirmOperation = randomUUID();
  const confirmBody = { operationId: confirmOperation, expectedRevision: 2, action: "confirm" };
  const [confirmed, replayed] = await Promise.all([
    demo.agent.post(`/api/workspace/recipe-candidates/${first.body.id}/decision`).send(confirmBody),
    demo.agent.post(`/api/workspace/recipe-candidates/${first.body.id}/decision`).send(confirmBody),
  ]);
  expect({ statuses: [confirmed.status, replayed.status], bodies: [confirmed.body, replayed.body] })
    .toMatchObject({ statuses: [200, 200] });
  expect([confirmed.body, replayed.body]).toEqual(expect.arrayContaining([
    expect.objectContaining({ status: "confirmed", recipeId: expect.any(String), revision: 3 }),
  ]));
  expect(await prisma.recipe.count({ where: { restaurantId: demo.restaurantId, name: "Poêlée corrigée" } })).toBe(1);
  expect(await prisma.recipeVersion.count({ where: { restaurantId: demo.restaurantId, operationId: confirmOperation } })).toBe(1);
  expect(await demo.agent.get("/api/workspace/recipes").expect(200).then((response) =>
    response.body.map((recipe: { name: string }) => recipe.name))).toContain("Poêlée corrigée");
  const candidates = await demo.agent.get("/api/workspace/recipe-candidates").expect(200);
  expect(candidates.body.candidates.map((item: { id: string; status: string }) => [item.id, item.status]))
    .toEqual(expect.arrayContaining([[first.body.id, "confirmed"], [second.body.id, "pending"]]));
  expect(await prisma.product.findMany({ where: { restaurantId: demo.restaurantId },
    select: { id: true, currentStock: true, stockRevision: true } })).toEqual(stockBefore);
  expect(await prisma.stockMovement.count({ where: { restaurantId: demo.restaurantId } })).toBe(movementCountBefore);
  expect(await prisma.production.count({ where: { restaurantId: demo.restaurantId } })).toBe(productionCountBefore);
  expect(await prisma.recommendationDecision.count({ where: { restaurantId: demo.restaurantId,
    operationId: confirmOperation, decision: "recipe_candidate_confirmed" } })).toBe(1);

  await prisma.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId: demo.restaurantId,
    kind: `source-invoice:${creamSource.id}` } }, data: { revision: { increment: 1 } } });
  await demo.agent.post(`/api/workspace/recipe-candidates/${second.body.id}/decision`).send({
    operationId: randomUUID(), expectedRevision: second.body.revision, action: "confirm",
  }).expect(409).expect(({ body }) => expect(body.error.code).toBe("SOURCE_CHANGED"));
  expect(await demo.agent.get("/api/workspace/recipe-candidates").expect(200).then((response) =>
    response.body.candidates.find((item: { id: string }) => item.id === second.body.id).status)).toBe("pending");
  expect(await other.agent.patch(`/api/workspace/recipe-candidates/${first.body.id}`).send({
    ...candidate("Intrusion", mushrooms.id, mushroomSource.id, "kg"), expectedRevision: 2, operationId: randomUUID(),
  }).expect(404).then((response) => response.body.error.code)).toBe("NOT_FOUND");
});
