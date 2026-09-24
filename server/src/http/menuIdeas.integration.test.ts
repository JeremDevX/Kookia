import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];
type WorkspaceTestAgent = ReturnType<typeof request.agent>;
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

async function account(label: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: `${label} menu test`,
    email: `${label}-${randomUUID()}@example.com`, password: "menu idea integration password" }).expect(201);
  users.push(response.body.user.id);
  const catalog = await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id }, include: { restaurant: true } });
  return { agent, userId: user.id, restaurantId: user.restaurant!.id, suppliers: catalog.body.suppliers as Array<{ id: string }> };
}

async function product(agent: WorkspaceTestAgent, supplierId: string, name: string) {
  return (await agent.post("/api/workspace/products").send({ operationId: randomUUID(), name, category: "Fixture",
    currentStock: 0, unit: "kg", minThreshold: 0, supplierId, pricePerUnit: 2 }).expect(201)).body as {
    id: string; unit: string; stockRevision: number;
  };
}

async function count(agent: WorkspaceTestAgent, item: { id: string; unit: string; stockRevision: number }, quantity: number) {
  return (await agent.post(`/api/workspace/products/${item.id}/counts`).send({ operationId: randomUUID(),
    expectedStockRevision: item.stockRevision, expectedUnit: item.unit, countedQuantity: quantity }).expect(201)).body;
}

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const offsetDate = (date: string, offset: number) => new Date(Date.parse(`${date}T00:00:00.000Z`) + offset * 86_400_000)
  .toISOString().slice(0, 10);

it("generates reviewable menu ideas only from an explicitly labelled current count in the demo workspace", async () => {
  const demo = await account("menu-demo");
  const other = await account("menu-other");
  await prisma.restaurant.update({ where: { id: demo.restaurantId }, data: { mode: "demo" } });
  expect(await other.agent.get("/api/workspace/menu/surplus-options").expect(200).then((response) => response.body))
    .toEqual({ available: false, options: [] });

  const tomato = await product(demo.agent, demo.suppliers[0].id, "Tomates fixture");
  const pasta = await product(demo.agent, demo.suppliers[0].id, "Pâtes fixture");
  const uncounted = await product(demo.agent, demo.suppliers[0].id, "Crème non comptée");
  const tomatoCount = await count(demo.agent, tomato, 2);
  await count(demo.agent, pasta, 20);
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: demo.restaurantId, id: tomato.id } },
    data: { minThreshold: 1000 } });
  const staleSelection = { productId: tomato.id, stockCountId: tomatoCount.count.id,
    expectedStockRevision: tomatoCount.product.stockRevision, quantity: 2 };
  const stockBeforeStaleMutation = await demo.agent.get("/api/workspace/catalog").expect(200);
  const tomatoCurrent = stockBeforeStaleMutation.body.products.find((item: { id: string }) => item.id === tomato.id);
  await demo.agent.post(`/api/workspace/products/${tomato.id}/stock`).send({ operationId: randomUUID(), delta: 1 }).expect(200);
  await demo.agent.post("/api/workspace/menu/ideas").send({ operationId: randomUUID(), surplus: [staleSelection] })
    .expect(409).expect(({ body }) => expect(body.error.code).toBe("STOCK_COUNT_STALE"));
  const recounted = await count(demo.agent, { id: tomato.id, unit: tomato.unit, stockRevision: tomatoCurrent.stockRevision + 1 }, 3);

  const options = await demo.agent.get("/api/workspace/menu/surplus-options").expect(200);
  expect(options.body.available).toBe(true);
  expect(options.body.options.map((option: { productId: string }) => option.productId).sort()).toEqual([tomato.id, pasta.id].sort());
  expect(options.body.options.find((option: { productId: string }) => option.productId === tomato.id))
    .toMatchObject({ stockCountId: recounted.count.id, countedQuantity: 3, unit: "kg" });

  const today = parisToday();
  const feasible = await demo.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Pâtes tomate faisables",
    category: "Plat", prepTime: 15, yieldPortions: 4, effectiveFrom: today,
    ingredients: [{ productId: tomato.id, quantity: 2 }, { productId: pasta.id, quantity: 1 }] }).expect(201);
  const blocked = await demo.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Pâtes crème non vérifiées",
    category: "Entrée", prepTime: 15, yieldPortions: 4, effectiveFrom: today,
    ingredients: [{ productId: tomato.id, quantity: 1 }, { productId: uncounted.id, quantity: 1 }] }).expect(201);
  const revised = await demo.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Ancien plat tomate",
    category: "Plat", prepTime: 15, yieldPortions: 4, effectiveFrom: offsetDate(today, -1),
    ingredients: [{ productId: tomato.id, quantity: 1 }] }).expect(201);
  await demo.agent.patch(`/api/workspace/recipes/${revised.body.id}`).send({ operationId: randomUUID(), expectedRevision: 1,
    name: "Plat sans tomate", category: "Plat", prepTime: 15, yieldPortions: 4, effectiveFrom: today,
    ingredients: [{ productId: pasta.id, quantity: 1 }] }).expect(200);
  const operationId = randomUUID();
  const input = { operationId, surplus: [{ productId: tomato.id, stockCountId: recounted.count.id,
    expectedStockRevision: recounted.product.stockRevision, quantity: 2 }] };
  const movementsBeforeIdeas = await prisma.stockMovement.count({ where: { restaurantId: demo.restaurantId } });
  const [first, retry] = await Promise.all([demo.agent.post("/api/workspace/menu/ideas").send(input),
    demo.agent.post("/api/workspace/menu/ideas").send(input)]);
  expect(first.status).toBe(200);
  expect(retry.status).toBe(200);
  expect(first.body.replayed).not.toBe(retry.body.replayed);
  expect(first.body).toMatchObject({ provenance: "demo_simulation", asOfDate: today,
    ideas: expect.arrayContaining([
      expect.objectContaining({ recipeId: feasible.body.id, recipeName: "Pâtes tomate faisables", status: "feasible", maximumPortions: 4,
        expiryStatus: "unknown", surplusProducts: expect.arrayContaining([expect.objectContaining({ productId: tomato.id, quantity: 2, unit: "kg" })]) }),
      expect.objectContaining({ recipeId: blocked.body.id, recipeName: "Pâtes crème non vérifiées", status: "not_feasible", maximumPortions: null,
        blockers: ["Stock de Crème non comptée non vérifié."], expiryStatus: "unknown" },
      ),
    ]) });
  expect(first.body.ideas.map((idea: { recipeId: string }) => idea.recipeId)).not.toContain(revised.body.id);
  expect(retry.body.ideas).toEqual(first.body.ideas);
  await demo.agent.post("/api/workspace/menu/ideas").send({ ...input, surplus: [{ ...input.surplus[0], quantity: 1 }] })
    .expect(409).expect(({ body }) => expect(body.error.code).toBe("OPERATION_CONFLICT"));
  expect(await prisma.recommendationDecision.count({ where: { restaurantId: demo.restaurantId, operationId,
    decision: "menu_ideas_generated" } })).toBe(1);
  expect(await prisma.stockMovement.count({ where: { restaurantId: demo.restaurantId } })).toBe(movementsBeforeIdeas);
  expect(await prisma.production.count({ where: { restaurantId: demo.restaurantId } })).toBe(0);
  await other.agent.post("/api/workspace/menu/ideas").send(input).expect(409)
    .expect(({ body }) => expect(body.error.code).toBe("DEMO_ONLY"));
  const foreignProduct = await product(other.agent, other.suppliers[0].id, "Autre tenant");
  await demo.agent.post("/api/workspace/menu/ideas").send({ operationId: randomUUID(), surplus: [{
    productId: foreignProduct.id, stockCountId: randomUUID(), expectedStockRevision: 1, quantity: 1,
  }] }).expect(404);
});
