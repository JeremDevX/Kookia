import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: "Catalog test", email: `catalog-${randomUUID()}@example.com`, password: "catalog integration password",
  }).expect(201);
  ids.push(response.body.user.id);
  return agent;
}

describe("persistent catalog HTTP", () => {
  it("authenticates, validates, persists, isolates and prevents overspending stock", async () => {
    await request(app).get("/api/workspace/catalog").expect(401);
    const first = await account();
    const second = await account();
    const initial = await first.get("/api/workspace/catalog").expect(200);
    expect(initial.body.products).toHaveLength(catalog.products.length);
    for (const expected of catalog.products) {
      expect(initial.body.products.find((item: { id: string }) => item.id === expected.id)).toEqual(expected);
    }
    expect(initial.body.suppliers).toEqual(catalog.suppliers);
    const product = initial.body.products[0];
    const created = await first.post("/api/workspace/products").send({
      operationId: randomUUID(), name: "Test product", category: "Légumes", currentStock: 10,
      unit: "kg", minThreshold: 2, pricePerUnit: 1.25, supplierId: product.supplierId,
    }).expect(201);
    const id = created.body.id;
    const operationId = randomUUID();
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: -2.5 }).expect(200);
    const repeated = await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: -2.5 }).expect(200);
    expect(repeated.body.currentStock).toBe(7.5);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: 4 }).expect(409);
    await second.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: 1 }).expect(404);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: "bad" }).expect(400);
    const concurrent = await Promise.all([1, 2].map(() => first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: -5 })));
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 409]);
    const refreshed = await first.get("/api/workspace/catalog").expect(200);
    expect(refreshed.body.products.find((item: { id: string }) => item.id === id).currentStock).toBe(2.5);
    const history = await first.get(`/api/workspace/products/${id}/movements`).expect(200);
    expect(history.body).toHaveLength(3);
    const foreign = await second.get("/api/workspace/catalog").expect(200);
    expect(foreign.body.products.some((item: { id: string }) => item.id === id)).toBe(false);
    await first.post("/api/workspace/products").send({
      operationId: randomUUID(), name: "Invalid", category: "Légumes", currentStock: 10,
      unit: "kg", minThreshold: 2, pricePerUnit: 1, supplierId: randomUUID(),
    }).expect(400);
  });
  it("deducts recipe ingredients atomically, records history and rejects repeat/conflicting production", async () => {
    const agent = await account();
    const recipes = await agent.get("/api/workspace/recipes").expect(200);
    expect(recipes.body).toHaveLength(catalog.recipes.length);
    for (const expected of catalog.recipes) {
      const actual = recipes.body.find((item: { id: string }) => item.id === expected.id);
      expect(actual).toEqual({ ...expected, ...(expected.lastMade ? { lastMade: new Date(expected.lastMade.slice(0, 10)).toISOString() } : {}), ingredients: expect.arrayContaining(expected.ingredients) });
      expect(actual.ingredients).toHaveLength(expected.ingredients.length);
    }
    const recipe = recipes.body[0];
    const before = await agent.get("/api/workspace/catalog").expect(200);
    const input = { operationId: randomUUID(), recipeId: recipe.id, recipeName: recipe.name,
      portions: 1, prepTime: recipe.prepTime, notes: "", date: "2026-09-11", kind: "production" };
    const saved = await agent.post("/api/workspace/productions").send(input).expect(201);
    const duplicate = await agent.post("/api/workspace/productions").send(input).expect(201);
    expect(duplicate.body.id).toBe(saved.body.id);
    await agent.post("/api/workspace/productions").send({ ...input, portions: 2 }).expect(409);
    const after = await agent.get("/api/workspace/catalog").expect(200);
    for (const ingredient of recipe.ingredients) {
      const initial = before.body.products.find((product: { id: string }) => product.id === ingredient.productId);
      const changed = after.body.products.find((product: { id: string }) => product.id === ingredient.productId);
      expect(changed.currentStock).toBeCloseTo(initial.currentStock - ingredient.quantity, 3);
    }
    await agent.post("/api/workspace/productions").send({ ...input, operationId: randomUUID(), portions: 10000 }).expect(409);
    const failed = await agent.get("/api/workspace/catalog").expect(200);
    expect(failed.body).toEqual(after.body);
    const manual = { ...input, recipeId: undefined, operationId: randomUUID(), recipeName: "Production libre", kind: "record" };
    await agent.post("/api/workspace/productions").send(manual).expect(201);
    const noDeduction = await agent.get("/api/workspace/catalog").expect(200);
    expect(noDeduction.body).toEqual(after.body);
    const recipesBeforeRefusal = await agent.get("/api/workspace/recipes").expect(200);
    const refusal = { ...input, operationId: randomUUID(), portions: 3, date: "2026-09-12", kind: "refusal" };
    await agent.post("/api/workspace/productions").send(refusal).expect(201);
    await agent.post("/api/workspace/productions").send(refusal).expect(201);
    const afterRefusal = await agent.get("/api/workspace/catalog").expect(200);
    expect(afterRefusal.body).toEqual(after.body);
    const recipesAfterRefusal = await agent.get("/api/workspace/recipes").expect(200);
    expect(recipesAfterRefusal.body).toEqual(recipesBeforeRefusal.body);
    const history = await agent.get("/api/workspace/productions").expect(200);
    expect(history.body).toHaveLength(3);
    expect(history.body.filter((item: { kind: string }) => item.kind === "refusal")).toHaveLength(1);
  });

  it("serves persisted predictions/analytics and preserves server preferences during legacy initialization", async () => {
    const agent = await account();
    const other = await account();
    const predictions = await agent.get("/api/workspace/predictions").expect(200);
    expect(predictions.body).toHaveLength(catalog.predictions.length);
    for (const expected of catalog.predictions) {
      expect(predictions.body.find((item: { id: string }) => item.id === expected.id)).toEqual(expected);
    }
    const analytics = await agent.get("/api/workspace/analytics").expect(200);
    expect(analytics.body).toEqual(catalog.analytics);
    const activity = await agent.get("/api/workspace/activity").expect(200);
    expect(activity.body).toEqual(catalog.activity);
    await request(app).get("/api/workspace/analytics").expect(401);
    const empty = await agent.get("/api/workspace/preferences").expect(200);
    expect(empty.body).toBeNull();
    const settings = { wasteTarget: "65", alertThreshold: "70", showTrends: false, showAI: true, showROI: false };
    await agent.post("/api/workspace/preferences").send({ settings, initializeOnly: true }).expect(200);
    await agent.post("/api/workspace/preferences").send({ settings: { ...settings, wasteTarget: "999" }, initializeOnly: true }).expect(200);
    const saved = await agent.get("/api/workspace/preferences").expect(200);
    expect(saved.body).toEqual(settings);
    const isolated = await other.get("/api/workspace/preferences").expect(200);
    expect(isolated.body).toBeNull();
    await agent.post("/api/workspace/preferences").send({ settings: { ...settings, alertThreshold: "101" } }).expect(400);
    await agent.post("/api/workspace/preferences").send({ settings: { ...settings, wasteTarget: "42" } }).expect(200);
    const updated = await agent.get("/api/workspace/preferences").expect(200);
    expect(updated.body.wasteTarget).toBe("42");
  });

  it("validates reviewed orders once and journals original suggestions without changing stock", async () => {
    const agent = await account();
    const initial = await agent.get("/api/workspace/catalog").expect(200);
    const predictions = await agent.get("/api/workspace/predictions").expect(200);
    const prediction = predictions.body.find((item: { recommendation?: { action: string } }) => item.recommendation?.action === "buy");
    const input = { operationId: randomUUID(), lines: [{ productId: prediction.productId, predictionId: prediction.id, quantity: 3 }] };
    const [one, two] = await Promise.all([agent.post("/api/workspace/orders").send(input), agent.post("/api/workspace/orders").send(input)]);
    expect(one.status).toBe(201);
    expect(two.status).toBe(201);
    expect(one.body.id).toBe(two.body.id);
    expect(one.body.status).toBe("validated");
    await agent.post("/api/workspace/orders").send({ ...input, lines: [{ ...input.lines[0], quantity: 4 }] }).expect(409);
    await agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: "missing", quantity: 3 }] }).expect(400);
    const history = await agent.get("/api/workspace/orders").expect(200);
    expect(history.body).toHaveLength(1);
    const decisions = await agent.get("/api/workspace/decisions").expect(200);
    expect(decisions.body).toHaveLength(1);
    expect(decisions.body[0].snapshot.input).toEqual(input.lines);
    expect(decisions.body[0].snapshot.suggestions[0].quantity).toBe(prediction.recommendation.quantity);
    const unchanged = await agent.get("/api/workspace/catalog").expect(200);
    expect(unchanged.body).toEqual(initial.body);
  });

  it("persists concurrent cart additions and removes only validated selections atomically", async () => {
    const agent = await account();
    const other = await account();
    const catalog = await agent.get("/api/workspace/catalog").expect(200);
    const items = catalog.body.products.slice(0, 2).map((product: { id: string; unit: string }, index: number) => ({
      id: `cart-${index}`, productId: product.id, productName: "Untrusted name", quantity: 2, unit: product.unit, source: "stocks",
    }));
    const additions = await Promise.all(items.map((item: object) => agent.post("/api/workspace/cart").send({ action: "add", items: [item] })));
    expect(additions.every((response) => response.status === 200)).toBe(true);
    await agent.post("/api/workspace/cart").send({ action: "add", items: [items[0]] }).expect(200);
    const cart = await agent.get("/api/workspace/cart").expect(200);
    expect(cart.body).toHaveLength(2);
    expect(cart.body.find((item: { id: string }) => item.id === items[0].id).productName).toBe(catalog.body.products[0].name);
    const isolated = await other.get("/api/workspace/cart").expect(200);
    expect(isolated.body).toEqual([]);
    await agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: items[0].productId, cartId: items[1].id, quantity: 2 }] }).expect(409);
    const operation = { operationId: randomUUID(), lines: [{ productId: items[0].productId, cartId: items[0].id, quantity: 3 }] };
    await agent.post("/api/workspace/orders").send(operation).expect(201);
    await agent.post("/api/workspace/orders").send(operation).expect(201);
    const remaining = await agent.get("/api/workspace/cart").expect(200);
    expect(remaining.body).toHaveLength(1);
    expect(remaining.body[0].id).toBe(items[1].id);
    await agent.post("/api/workspace/cart").send({ action: "remove", ids: [items[1].id] }).expect(200);
    const empty = await agent.get("/api/workspace/cart").expect(200);
    expect(empty.body).toEqual([]);
  });

});
