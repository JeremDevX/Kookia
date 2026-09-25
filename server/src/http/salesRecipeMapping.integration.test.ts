import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const userIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: userIds } } }); await prisma.$disconnect(); });

async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Mapping test",
    email: `mapping-${randomUUID()}@example.com`, password: "mapping integration password" }).expect(201);
  userIds.push(result.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  return agent;
}

const parisDate = (offset: number) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
    month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(Date.parse(today) + offset * 86_400_000).toISOString().slice(0, 10);
};

it("requires an explicit tenant-scoped dated mapping and preserves menu history", async () => {
  const owner = await account();
  const other = await account();
  await request(app).get("/api/workspace/sales/recipe-mappings").expect(401);
  const catalog = await owner.get("/api/workspace/catalog").expect(200);
  const itemName = `Plat D6 ${randomUUID()}`;
  const saleItem = await owner.post("/api/workspace/sales/items").send({ name: itemName }).expect(201);
  const recipeInput = { operationId: randomUUID(), name: itemName, category: "Plat", prepTime: 20,
    yieldPortions: 4, effectiveFrom: parisDate(0),
    ingredients: [{ productId: catalog.body.products[0].id, quantity: 2 }] };
  const recipe = await owner.post("/api/workspace/recipes").send(recipeInput).expect(201);
  const demoSaleItem = await owner.post("/api/workspace/sales/items").send({ name: `${itemName} — démonstration` }).expect(201);
  const initial = await owner.get("/api/workspace/sales/recipe-mappings").expect(200);
  expect(initial.body.find((item: { id: string }) => item.id === saleItem.body.id))
    .toMatchObject({ revision: 0, suggestedRecipeId: recipe.body.id, suggestionBasis: "normalized_name", mappings: [] });
  expect(initial.body.find((item: { id: string }) => item.id === demoSaleItem.body.id))
    .toMatchObject({ revision: 0, suggestedRecipeId: recipe.body.id, suggestionBasis: "demo_suffix_ignored", mappings: [] });

  const first = { saleItemId: saleItem.body.id, recipeId: recipe.body.id, expectedRevision: 0,
    operationId: randomUUID(), effectiveFrom: parisDate(0), portionsPerItem: 1.5 };
  await owner.post("/api/workspace/sales/recipe-mappings").send({ ...first, saleItemId: randomUUID() }).expect(400);
  const foreignRecipe = await other.post("/api/workspace/recipes").send({ ...recipeInput, operationId: randomUUID(),
    name: `Autre ${itemName}`, ingredients: [{ productId: (await other.get("/api/workspace/catalog").expect(200)).body.products[0].id, quantity: 1 }] }).expect(201);
  await owner.post("/api/workspace/sales/recipe-mappings").send({ ...first, recipeId: foreignRecipe.body.id }).expect(400);

  const saved = await owner.post("/api/workspace/sales/recipe-mappings").send(first);
  expect(saved.status, JSON.stringify(saved.body)).toBe(201);
  expect(saved.body).toMatchObject({ saleItemId: saleItem.body.id, recipeId: recipe.body.id, revision: 1,
    effectiveFrom: first.effectiveFrom, portionsPerItem: 1.5, actorId: expect.any(String), replayed: false });
  expect((await owner.post("/api/workspace/sales/recipe-mappings").send(first).expect(201)).body)
    .toMatchObject({ revision: 1, replayed: true });
  await owner.post("/api/workspace/sales/recipe-mappings").send({ ...first, portionsPerItem: 2 }).expect(409);
  await owner.post("/api/workspace/sales/recipe-mappings").send({ ...first, operationId: randomUUID(), expectedRevision: 1 }).expect(409);
  await owner.patch(`/api/workspace/recipes/${recipe.body.id}`).send({ ...recipeInput, operationId: randomUUID(),
    expectedRevision: 1, name: `Renommée ${itemName}` }).expect(200);

  const nextRecipe = await owner.post("/api/workspace/recipes").send({ ...recipeInput,
    operationId: randomUUID(), name: `Carte suivante ${itemName}` }).expect(201);
  const future = { saleItemId: saleItem.body.id, recipeId: nextRecipe.body.id, expectedRevision: 1,
    operationId: randomUUID(), effectiveFrom: parisDate(1), portionsPerItem: 2 };
  await owner.post("/api/workspace/sales/recipe-mappings").send(future).expect(201)
    .then(({ body }) => expect(body).toMatchObject({ revision: 2, effectiveFrom: future.effectiveFrom, recipeName: nextRecipe.body.name }));
  await owner.post("/api/workspace/sales/recipe-mappings").send({ ...future, operationId: randomUUID(),
    expectedRevision: 1, effectiveFrom: parisDate(2) }).expect(409);
  const history = await owner.get("/api/workspace/sales/recipe-mappings").expect(200);
  const saleItemHistory = history.body.find((row: { id: string }) => row.id === saleItem.body.id);
  expect(saleItemHistory.mappings.map((row: { revision: number; recipeId: string }) => [row.revision, row.recipeId]))
    .toEqual([[2, nextRecipe.body.id], [1, recipe.body.id]]);
  expect(saleItemHistory.mappings.find((row: { revision: number }) => row.revision === 1).recipeName).toBe(itemName);
  expect((await other.get("/api/workspace/sales/recipe-mappings").expect(200)).body).toEqual([]);

  const legacyRecipe = (await owner.get("/api/workspace/recipes").expect(200)).body.find((row: { effectiveFrom: string | null }) => row.effectiveFrom === null);
  const legacyItem = await owner.post("/api/workspace/sales/items").send({ name: `Inconnu ${randomUUID()}` }).expect(201);
  await owner.post("/api/workspace/sales/recipe-mappings").send({ saleItemId: legacyItem.body.id,
    recipeId: legacyRecipe.id, expectedRevision: 0, operationId: randomUUID(), effectiveFrom: parisDate(0), portionsPerItem: 1 }).expect(409);
  const catalogAfter = await owner.get("/api/workspace/catalog").expect(200);
  expect(catalogAfter.body.products.find((product: { id: string }) => product.id === catalog.body.products[0].id).currentStock)
    .toBe(catalog.body.products[0].currentStock);
});
