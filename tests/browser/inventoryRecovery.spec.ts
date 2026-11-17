import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("reprend un inventaire sur mobile après la perte de la réponse de validation", async ({ page }) => {
  const password = "mot de passe du compte de test";
  const email = `inventaire-${randomUUID()}@example.test`;
  const registration = await page.request.post("/api/auth/register", { data: { displayName: "Inventaire test", email, password } });
  expect(registration.status()).toBe(201);
  const { user } = await registration.json() as { user: { id: string } };
  const headers = { "X-Expected-User-Id": user.id };
  try {
    const setup = await page.request.post("/api/setup", { data: {
      expectedUserId: user.id, name: "Restaurant test", type: "Restaurant", city: "Paris", address: "", phone: "", email, dailyCovers: 20,
    } });
    expect(setup.status()).toBe(201);
    const supplierId = randomUUID();
    const supplier = await page.request.post("/api/workspace/suppliers", { headers, data: { id: supplierId, name: "Fournisseur test", email, phone: "" } });
    expect(supplier.status()).toBe(201);
    const productId = randomUUID();
    const product = await page.request.post("/api/workspace/products", { headers, data: {
      operationId: productId, name: "Farine test", category: "Test", currentStock: 10, unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId,
    } });
    expect(product.status()).toBe(201);
    const steps = ["team", "suppliers", "review", null] as const;
    for (const [index, expectedStep] of steps.slice(0, -1).entries()) {
      const step = await page.request.patch("/api/setup/step", { headers, data: {
        expectedUserId: user.id, expectedStep, nextStep: steps[index + 1], expectedRevision: index + 1,
      } });
      expect(step.status()).toBe(200);
    }

    await page.goto("/stocks?stockView=count");
    await page.getByRole("button", { name: "Commencer l’inventaire" }).click();
    const quantity = page.getByRole("spinbutton", { name: "Quantité comptée : Farine test" });
    await quantity.fill("7.999");
    await quantity.press("ArrowUp");
    await expect(quantity).toHaveValue("8");
    await page.getByRole("textbox", { name: "Justification de l’écart : Farine test" }).fill("Casse");
    const saved = page.waitForResponse((response) => response.request().method() === "PUT" && response.url().includes("/api/workspace/inventory-session/"));
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByRole("button", { name: "Valider l’inventaire" })).toBeEnabled();
    await page.reload();
    await expect(quantity).toHaveValue("8");

    await page.route(/\/api\/workspace\/inventory-session\/[^/]+\/validate$/, async (route) => {
      const validated = await route.fetch();
      expect(validated.status()).toBe(200);
      await route.abort("failed");
    }, { times: 1 });
    await page.getByRole("button", { name: "Valider l’inventaire" }).click();
    const verify = page.getByRole("button", { name: "Vérifier la validation" });
    await expect(verify).toBeEnabled();
    await page.reload();
    await verify.click();
    await expect(page.getByRole("status").filter({ hasText: "Inventaire validé" })).toBeVisible();

    const counts = await page.request.get(`/api/workspace/products/${productId}/counts`, { headers });
    expect(counts.ok()).toBe(true);
    expect(await counts.json()).toEqual([expect.objectContaining({ inventoryReason: "Casse" })]);
  } finally {
    const cleanup = await page.request.delete("/api/account", { headers, data: { currentPassword: password } });
    expect(cleanup.status()).toBe(204);
  }
});
