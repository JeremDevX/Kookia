import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
const accountOwnerIds = new WeakMap<object, string>();
let tenantPeer: ReturnType<typeof request.agent> | undefined;
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
  accountOwnerIds.set(agent, response.body.user.id);
  return agent;
}

describe("persistent catalog HTTP", () => {
  it("authenticates, validates, persists, isolates and prevents overspending stock", async () => {
    await request(app).get("/api/workspace/catalog").expect(401);
    const first = await account();
    const second = await account();
    tenantPeer = second;
    const initial = await first.get("/api/workspace/catalog").expect(200);
    expect(initial.body.products).toHaveLength(catalog.products.length);
    for (const expected of catalog.products) {
      expect(initial.body.products.find((item: { id: string }) => item.id === expected.id)).toEqual({ ...expected, revision: 1, stockRevision: 1, latestCount: null });
    }
    expect(initial.body.suppliers).toEqual(catalog.suppliers);
    const product = initial.body.products[0];
    const created = await first.post("/api/workspace/products").send({
      operationId: randomUUID(), name: "Test product", category: "Légumes", currentStock: 10,
      unit: "kg", minThreshold: 2, pricePerUnit: 1.25, supplierId: product.supplierId,
    }).expect(201);
    const id = created.body.id;
    const original = { productName: created.body.name, supplierName: initial.body.suppliers.find((supplier: { id: string }) => supplier.id === created.body.supplierId).name,
      unit: created.body.unit, pricePerUnit: created.body.pricePerUnit };
    await first.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: id, quantity: 2 }] }).expect(201);
    const localSupplierId = randomUUID();
    await first.post("/api/workspace/suppliers").send({ id: localSupplierId, name: "Fournisseur révisé", email: "reviewed@example.com", phone: "" }).expect(201);
    const edits = [
      { expectedRevision: 1, name: "Fiche revue", category: "Frais", minThreshold: 2.5, supplierId: localSupplierId, pricePerUnit: 12.3456 },
      { expectedRevision: 1, name: "Modification concurrente", category: "Autre", minThreshold: 3, supplierId: localSupplierId, pricePerUnit: 9.8765 },
    ];
    const editResults = await Promise.all(edits.map((edit) => first.patch(`/api/workspace/products/${id}`).send(edit)));
    expect(editResults.map((response) => response.status).sort()).toEqual([200, 409]);
    const winnerIndex = editResults.findIndex((response) => response.status === 200);
    expect(editResults[winnerIndex].body.revision).toBe(2);
    expect(editResults[winnerIndex].body).toMatchObject({ name: edits[winnerIndex].name, category: edits[winnerIndex].category,
      minThreshold: edits[winnerIndex].minThreshold, supplierId: localSupplierId, pricePerUnit: edits[winnerIndex].pricePerUnit });
    expect(editResults[winnerIndex].body.currentStock).toBe(created.body.currentStock);
    expect(editResults[winnerIndex].body.unit).toBe(created.body.unit);
    const orders = await first.get("/api/workspace/orders").expect(200);
    expect(orders.body[0].lines[0]).toMatchObject(original);
    await first.patch(`/api/workspace/products/${id}`).send(edits[0]).expect(409);
    const foreignSupplierId = randomUUID();
    await second.post("/api/workspace/suppliers").send({ id: foreignSupplierId, name: "Fournisseur isolé", email: "isolated@example.com", phone: "" }).expect(201);
    await first.patch(`/api/workspace/products/${id}`).send({ ...edits[0], expectedRevision: 2, supplierId: foreignSupplierId }).expect(400);
    await second.patch(`/api/workspace/products/${id}`).send({ ...edits[0], expectedRevision: 1, supplierId: foreignSupplierId }).expect(404);
    await first.patch(`/api/workspace/products/${id}`).send({ ...edits[0], expectedRevision: 2, unit: "L" }).expect(400);
    const operationId = randomUUID();
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: -2.5 }).expect(200);
    const repeated = await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: -2.5 }).expect(200);
    expect(repeated.body.currentStock).toBe(7.5);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: 4 }).expect(409);
    await second.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: 1 }).expect(404);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: "bad" }).expect(400);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: 1, reason: "loss" }).expect(400);
    const concurrent = await Promise.all([1, 2].map(() => first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: -5 })));
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 409]);
    const stockRevision = 3;
    const zeroVarianceInput = { operationId: randomUUID(), expectedStockRevision: stockRevision, expectedUnit: "kg", countedQuantity: 2.5 };
    const zeroVariance = await Promise.all([1, 2].map(() => first.post(`/api/workspace/products/${id}/counts`).send(zeroVarianceInput)));
    expect(zeroVariance.map((response) => response.status)).toEqual([201, 201]);
    expect(zeroVariance[0].body.count.id).toBe(zeroVariance[1].body.count.id);
    expect(zeroVariance[0].body.count.delta).toBe(0);
    expect(zeroVariance[0].body.count.stockRevisionAfter).toBe(stockRevision);
    expect(zeroVariance[0].body.count.actorId).toBeTypeOf("string");
    expect(zeroVariance[0].body.count.countDate).toBe(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
    await first.post(`/api/workspace/products/${id}/counts`).send({ ...zeroVarianceInput, countedQuantity: 3 }).expect(409);
    const afterZero = await first.get("/api/workspace/catalog").expect(200);
    expect(afterZero.body.products.find((item: { id: string }) => item.id === id).latestCount).toMatchObject({ countedQuantity: 2.5, delta: 0 });
    expect(await prisma.stockMovement.count({ where: { stockCountId: zeroVariance[0].body.count.id } })).toBe(0);
    const discrepancyInput = { operationId: randomUUID(), expectedStockRevision: stockRevision, expectedUnit: "kg", countedQuantity: 0 };
    const discrepancy = await first.post(`/api/workspace/products/${id}/counts`).send(discrepancyInput).expect(201);
    expect(discrepancy.body.count).toMatchObject({ theoreticalQuantity: 2.5, countedQuantity: 0, delta: -2.5,
      stockRevisionBefore: stockRevision, stockRevisionAfter: stockRevision + 1 });
    expect(discrepancy.body.product.currentStock).toBe(0);
    const countMovement = await prisma.stockMovement.findFirstOrThrow({ where: { stockCountId: discrepancy.body.count.id } });
    expect(Number(countMovement.delta)).toBe(-2.5);
    await first.post(`/api/workspace/products/${id}/counts`).send({ ...discrepancyInput, operationId: randomUUID() }).expect(409);
    await first.post(`/api/workspace/products/${id}/counts`).send({ ...discrepancyInput, operationId: randomUUID(), countedQuantity: -0.001 }).expect(400);
    await first.post(`/api/workspace/products/${id}/counts`).send({ ...discrepancyInput, operationId: randomUUID(), countDate: "2026-09-23" }).expect(400);
    await first.post(`/api/workspace/products/${id}/counts`).send({ ...discrepancyInput, operationId: randomUUID(), expectedStockRevision: stockRevision + 1, expectedUnit: "L" }).expect(409);
    await second.post(`/api/workspace/products/${id}/counts`).send({ ...discrepancyInput, operationId: randomUUID() }).expect(404);
    await second.get(`/api/workspace/products/${id}/counts`).expect(404);
    expect(await first.get(`/api/workspace/products/${id}/counts`).expect(200).then((response) => response.body)).toHaveLength(2);
    const refreshed = await first.get("/api/workspace/catalog").expect(200);
    expect(refreshed.body.products.find((item: { id: string }) => item.id === id).currentStock).toBe(0);
    const history = await first.get(`/api/workspace/products/${id}/movements`).expect(200);
    expect(history.body).toHaveLength(4);
    const isolatedHistory = await second.get(`/api/workspace/products/${id}/movements`).expect(200);
    expect(isolatedHistory.body).toEqual([]);
    const foreign = await second.get("/api/workspace/catalog").expect(200);
    expect(foreign.body.products.some((item: { id: string }) => item.id === id)).toBe(false);
    await first.post("/api/workspace/products").send({
      operationId: randomUUID(), name: "Invalid", category: "Légumes", currentStock: 10,
      unit: "kg", minThreshold: 2, pricePerUnit: 1, supplierId: randomUUID(),
    }).expect(400);
  });
  it("creates and versions recipes while keeping production deductions and history frozen", async () => {
    const agent = await account();
    const other = tenantPeer ?? await account();
    const recipes = await agent.get("/api/workspace/recipes").expect(200);
    expect(recipes.body).toHaveLength(catalog.recipes.length);
    for (const expected of catalog.recipes) {
      const actual = recipes.body.find((item: { id: string }) => item.id === expected.id);
      expect(actual).toMatchObject({ id: expected.id, name: expected.name, category: expected.category,
        prepTime: expected.prepTime, yieldPortions: 1, revision: 1, version: 1, effectiveFrom: null });
      expect(actual.ingredients).toHaveLength(expected.ingredients.length);
      expect(actual.ingredients).toEqual(expect.arrayContaining(expected.ingredients.map((ingredient) =>
        expect.objectContaining({ ...ingredient, productName: expect.any(String), unit: expect.any(String) }))));
      expect(actual.versions).toHaveLength(1);
      expect(actual.versions[0]).toMatchObject({ version: 1, effectiveFrom: null, actorId: expect.any(String) });
    }
    const recipe = recipes.body[0];
    const firstIngredient = recipe.ingredients[0];
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const priorDate = new Date(`${today}T00:00:00.000Z`);
    priorDate.setUTCDate(priorDate.getUTCDate() - 1);
    const historicalDate = priorDate.toISOString().slice(0, 10);
    await Promise.all(recipe.ingredients.map((ingredient: { productId: string }) => agent.post(`/api/workspace/products/${ingredient.productId}/stock`).send({
      operationId: randomUUID(), delta: 100,
    }).expect(200)));
    const catalogBefore = await agent.get("/api/workspace/catalog").expect(200);
    const createInput = { operationId: randomUUID(), name: "Recette de test", category: "Plat", prepTime: 12,
      yieldPortions: 2, effectiveFrom: today, ingredients: [{ productId: firstIngredient.productId, quantity: 1.25 }] };
    const created = await agent.post("/api/workspace/recipes").send(createInput).expect(201);
    const createdReplay = await agent.post("/api/workspace/recipes").send(createInput).expect(201);
    expect(createdReplay.body.id).toBe(created.body.id);
    await agent.post("/api/workspace/recipes").send({ ...createInput, name: "Contenu différent" }).expect(409);
    const piecesProduct = catalogBefore.body.products.find((product: { unit: string }) => product.unit === "pcs");
    expect(piecesProduct).toBeDefined();
    await agent.post("/api/workspace/recipes").send({ ...createInput, operationId: randomUUID(),
      ingredients: [{ productId: piecesProduct.id, quantity: 1.5 }] }).expect(400);
    const piecesRecipe = await agent.post("/api/workspace/recipes").send({ ...createInput, operationId: randomUUID(),
      name: "Lot de pièces", yieldPortions: 2, ingredients: [{ productId: piecesProduct.id, quantity: 1 }] }).expect(201);
    const stockBeforeFractionalPortion = await agent.get("/api/workspace/catalog").expect(200);
    await agent.post("/api/workspace/productions").send({ operationId: randomUUID(), recipeId: piecesRecipe.body.id,
      expectedRecipeRevision: 1, recipeName: piecesRecipe.body.name, portions: 1, prepTime: 12, notes: "", date: today,
      kind: "production" }).expect(400);
    const stockAfterFractionalPortion = await agent.get("/api/workspace/catalog").expect(200);
    expect(stockAfterFractionalPortion.body.products.find((product: { id: string }) => product.id === piecesProduct.id))
      .toMatchObject({ currentStock: piecesProduct.currentStock, stockRevision: piecesProduct.stockRevision });
    expect(stockBeforeFractionalPortion.body.products.find((product: { id: string }) => product.id === piecesProduct.id))
      .toEqual(stockAfterFractionalPortion.body.products.find((product: { id: string }) => product.id === piecesProduct.id));
    const foreignCatalog = await other.get("/api/workspace/catalog").expect(200);
    const foreignProduct = await other.post("/api/workspace/products").send({ operationId: randomUUID(),
      name: "Produit autre espace", category: foreignCatalog.body.products[0].category, currentStock: 2, unit: "kg", minThreshold: 0.5,
      pricePerUnit: 1, supplierId: foreignCatalog.body.products[0].supplierId }).expect(201);
    await agent.post("/api/workspace/recipes").send({ ...createInput, operationId: randomUUID(),
      ingredients: [{ productId: foreignProduct.body.id, quantity: 1 }] }).expect(400);
    await agent.post("/api/workspace/recipes").send({ ...createInput, operationId: randomUUID(),
      ingredients: [{ productId: firstIngredient.productId, quantity: 1 }, { productId: firstIngredient.productId, quantity: 2 }] }).expect(400);
    await agent.patch(`/api/workspace/recipes/${recipe.id}`).send({ ...createInput, operationId: randomUUID(),
      expectedRevision: 1, effectiveFrom: "2999-01-01" }).expect(400);
    await other.patch(`/api/workspace/recipes/${created.body.id}`).send({ ...createInput, expectedRevision: 1 }).expect(404);

    const productionDate = historicalDate;
    const firstProduction = { operationId: randomUUID(), recipeId: recipe.id, expectedRecipeRevision: 1,
      recipeName: recipe.name, portions: 1, prepTime: recipe.prepTime, notes: "", date: productionDate, kind: "production" };
    const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: accountOwnerIds.get(agent)! }, select: { id: true } });
    const legacyOperationId = randomUUID();
    await prisma.production.create({ data: { restaurantId: restaurant.id, recipeId: recipe.id, recipeName: recipe.name,
      portions: 1, prepTime: recipe.prepTime, notes: "", date: new Date(`${productionDate}T00:00:00.000Z`),
      kind: "production", actorId: "migration:legacy-fixture", operationId: legacyOperationId } });
    const legacyReplay = await agent.post("/api/workspace/productions").send({ ...firstProduction,
      operationId: legacyOperationId }).expect(201);
    expect(legacyReplay.body.recipeVersionId).toBeNull();
    const saved = await agent.post("/api/workspace/productions").send(firstProduction).expect(201);
    const duplicate = await agent.post("/api/workspace/productions").send(firstProduction).expect(201);
    expect(duplicate.body.id).toBe(saved.body.id);
    expect(saved.body.recipeVersion).toMatchObject({ version: 1, yieldPortions: 1, effectiveFrom: null });
    await agent.post("/api/workspace/productions").send({ ...firstProduction, portions: 2 }).expect(409);
    await agent.post("/api/workspace/productions").send({ ...firstProduction, notes: "Autre note" }).expect(409);
    await agent.post("/api/workspace/productions").send({ ...firstProduction, operationId: randomUUID(), date: "2999-01-01" }).expect(400);
    const afterFirstProduction = await agent.get("/api/workspace/catalog").expect(200);
    for (const ingredient of recipe.ingredients) {
      const initial = catalogBefore.body.products.find((product: { id: string }) => product.id === ingredient.productId);
      const changed = afterFirstProduction.body.products.find((product: { id: string }) => product.id === ingredient.productId);
      expect(changed.currentStock).toBeCloseTo(initial.currentStock - ingredient.quantity, 3);
      expect(changed.stockRevision).toBe(initial.stockRevision + 1);
    }
    await agent.post("/api/workspace/productions").send({ ...firstProduction, operationId: randomUUID(), portions: 10000 }).expect(409);
    const failedProduction = await agent.get("/api/workspace/catalog").expect(200);
    expect(failedProduction.body).toEqual(afterFirstProduction.body);
    const manual = { ...firstProduction, recipeId: undefined, expectedRecipeRevision: undefined,
      operationId: randomUUID(), recipeName: "Production libre", kind: "record" };
    await agent.post("/api/workspace/productions").send(manual).expect(201);
    await agent.post("/api/workspace/productions").send({ ...manual, operationId: randomUUID(), kind: "refusal" }).expect(400);
    const refusal = { ...firstProduction, operationId: randomUUID(), portions: 3, date: historicalDate, kind: "refusal" };
    await agent.post("/api/workspace/productions").send(refusal).expect(201);

    const editedIngredients = recipe.ingredients.map((ingredient: { productId: string; quantity: number }) => ({
      productId: ingredient.productId, quantity: Number((ingredient.quantity * 1.5).toFixed(3)),
    }));
    const editInput = { operationId: randomUUID(), expectedRevision: 1, name: `${recipe.name} révisée`,
      category: recipe.category, prepTime: recipe.prepTime + 1, yieldPortions: 2, effectiveFrom: today, ingredients: editedIngredients };
    const edited = await agent.patch(`/api/workspace/recipes/${recipe.id}`).send(editInput).expect(200);
    expect(edited.body).toMatchObject({ revision: 2, version: 2, yieldPortions: 2, name: editInput.name, effectiveFrom: today });
    expect(edited.body.versions).toHaveLength(2);
    expect(edited.body.versions[0]).toMatchObject({ version: 2, yieldPortions: 2, effectiveFrom: today });
    const editReplay = await agent.patch(`/api/workspace/recipes/${recipe.id}`).send(editInput).expect(200);
    expect(editReplay.body.version).toBe(2);
    await agent.patch(`/api/workspace/recipes/${recipe.id}`).send({ ...editInput, name: "Contenu de rejeu différent" }).expect(409);
    const afterEditProduction = await agent.post("/api/workspace/productions").send({ ...firstProduction,
      operationId: randomUUID(), expectedRecipeRevision: 2, recipeName: editInput.name, portions: 1, date: today,
    }).expect(201);
    expect(afterEditProduction.body.recipeVersion).toMatchObject({ version: 2, yieldPortions: 2,
      effectiveFrom: `${today}T00:00:00.000Z` });
    expect(afterEditProduction.body.recipeName).toBe(editInput.name);
    const afterSecondProduction = await agent.get("/api/workspace/catalog").expect(200);
    for (let index = 0; index < recipe.ingredients.length; index++) {
      const ingredient = recipe.ingredients[index];
      const editedIngredient = editedIngredients.find((item: { productId: string }) => item.productId === ingredient.productId)!;
      const initial = catalogBefore.body.products.find((product: { id: string }) => product.id === ingredient.productId);
      const changed = afterSecondProduction.body.products.find((product: { id: string }) => product.id === ingredient.productId);
      expect(changed.currentStock).toBeCloseTo(initial.currentStock - ingredient.quantity - editedIngredient.quantity / 2, 3);
    }
    const frozenProduction = await prisma.production.findFirstOrThrow({ where: { operationId: firstProduction.operationId } });
    expect(frozenProduction.recipeVersionId).toBe(saved.body.recipeVersionId);
    const history = await agent.get("/api/workspace/productions").expect(200);
    expect(history.body).toHaveLength(5);
    expect(history.body.find((item: { operationId: string }) => item.operationId === firstProduction.operationId).recipeVersion)
      .toMatchObject({ version: 1, yieldPortions: 1, effectiveFrom: null });
    expect(history.body.filter((item: { kind: string }) => item.kind === "refusal")).toHaveLength(1);

    const concurrentEdits = ["A", "B"].map((suffix) => agent.patch(`/api/workspace/recipes/${recipe.id}`).send({
      ...editInput, operationId: randomUUID(), expectedRevision: 2, effectiveFrom: today, name: `${editInput.name} ${suffix}`,
    }));
    const editResults = await Promise.all(concurrentEdits);
    expect(editResults.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await agent.get("/api/workspace/catalog").expect(200)).body.products).toEqual(afterSecondProduction.body.products);
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

  it("validates reviewed stock orders once without changing stock or accepting demo predictions", async () => {
    const agent = await account();
    const initial = await agent.get("/api/workspace/catalog").expect(200);
    const predictions = await agent.get("/api/workspace/predictions").expect(200);
    const prediction = predictions.body.find((item: { recommendation?: { action: string } }) => item.recommendation?.action === "buy");
    await agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: prediction.productId, predictionId: prediction.id, quantity: 3 }] }).expect(400);
    await agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: "stale", productId: prediction.productId, productName: prediction.productName, quantity: 3, unit: "kg", source: "dashboard", predictionId: prediction.id }] }).expect(400);
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 7);
    const updated = await prisma.prediction.updateMany({ where: { id: prediction.id, restaurant: { ownerId: ids.at(-1)! } }, data: { predictedDate: future } });
    expect(updated.count).toBe(1);
    await agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: prediction.productId, predictionId: prediction.id, quantity: 3 }] }).expect(400);
    const input = { operationId: randomUUID(), lines: [{ productId: prediction.productId, quantity: 3 }] };
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
    expect(decisions.body[0].snapshot.suggestions).toEqual([]);
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
