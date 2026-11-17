import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("rend le focus au tiroir après un comptage au clavier sur mobile", async ({ page }) => {
  const password = "mot de passe du compte de test";
  const email = `fiche-produit-${randomUUID()}@example.test`;
  const registration = await page.request.post("/api/auth/register", { data: { displayName: "Fiche produit test", email, password } });
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
    const product = await page.request.post("/api/workspace/products", { headers, data: {
      operationId: randomUUID(), name: "Farine test", category: "Test", currentStock: 10, unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId,
    } });
    expect(product.status()).toBe(201);
    const steps = ["team", "suppliers", "review", null] as const;
    for (const [index, expectedStep] of steps.slice(0, -1).entries()) {
      const step = await page.request.patch("/api/setup/step", { headers, data: {
        expectedUserId: user.id, expectedStep, nextStep: steps[index + 1], expectedRevision: index + 1,
      } });
      expect(step.status()).toBe(200);
    }

    await page.goto("/stocks");
    await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
    const openDrawer = page.getByRole("button", { name: "Voir la fiche Farine test" });
    await expect(openDrawer).toBeVisible();
    await openDrawer.focus();
    await expect(openDrawer).toBeFocused();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Farine test", exact: true });
    const count = drawer.getByRole("button", { name: "Compter", exact: true });
    await expect(drawer.getByRole("button", { name: "Fermer les détails du produit" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(count).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Compter Farine test" });
    const close = dialog.getByRole("button", { name: "Fermer la modale" });
    const save = dialog.getByRole("button", { name: "Enregistrer le comptage" });
    await expect(drawer).toHaveJSProperty("inert", true);
    await expect(close).toBeFocused();
    await close.click({ trial: true });
    await page.keyboard.press("Shift+Tab");
    await expect(save).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(drawer).toHaveJSProperty("inert", false);
    await expect(count).toBeFocused();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("spinbutton", { name: "Quantité réellement comptée (kg)" })).toBeFocused();
    await page.keyboard.type("8");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(save).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(count).toBeFocused();
    await expect(drawer.getByText("Compté 8 kg · théorique 10 kg · écart -2 kg")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(openDrawer).toBeFocused();
  } finally {
    const cleanup = await page.request.delete("/api/account", { headers, data: { currentPassword: password } });
    expect(cleanup.status()).toBe(204);
  }
});
