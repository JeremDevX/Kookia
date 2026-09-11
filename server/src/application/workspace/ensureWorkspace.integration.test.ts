import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ensureWorkspace } from "./ensureWorkspace.js";
import catalog from "../../infrastructure/database/seed/catalog.json" with { type: "json" };

const createdUsers: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

async function createOwner() {
  const email = `workspace-test-${randomUUID()}@example.com`;
  const user = await prisma.user.create({ data: {
    email, emailNormalized: email, displayName: "Workspace test", passwordHash: "not-a-login-hash",
  } });
  createdUsers.push(user.id);
  return user.id;
}

describe("workspace bootstrap on PostgreSQL", () => {
  it("seeds the complete catalog once, preserves mutations and isolates owners", async () => {
    const owner = await createOwner();
    const [workspace, concurrent] = await Promise.all([ensureWorkspace(owner), ensureWorkspace(owner)]);
    expect(concurrent.id).toBe(workspace.id);
    const restaurantId = workspace.id;
    expect(await prisma.supplier.count({ where: { restaurantId } })).toBe(catalog.suppliers.length);
    expect(await prisma.product.count({ where: { restaurantId } })).toBe(catalog.products.length);
    expect(await prisma.recipe.count({ where: { restaurantId } })).toBe(catalog.recipes.length);
    expect(await prisma.recipeIngredient.count({ where: { restaurantId } })).toBe(
      catalog.recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0),
    );
    expect(await prisma.prediction.count({ where: { restaurantId } })).toBe(catalog.predictions.length);
    const analytics = await prisma.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: { restaurantId, kind: "analytics" } } });
    expect(analytics.data).toEqual(catalog.analytics);
    const id = catalog.products[0].id;
    await prisma.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: { currentStock: 123 } });
    await ensureWorkspace(owner);
    const persisted = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id } } });
    expect(Number(persisted.currentStock)).toBe(123);
    const other = await ensureWorkspace(await createOwner());
    expect(other.id).not.toBe(restaurantId);
    const untouched = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId: other.id, id } } });
    expect(Number(untouched.currentStock)).toBe(catalog.products[0].currentStock);
  });
});
