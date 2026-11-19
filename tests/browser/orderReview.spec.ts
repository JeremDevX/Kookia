import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { test } from "./restaurantFixture";

test("ouvre au clavier les services à compléter depuis les achats", async ({ page, restaurant }) => {
  await restaurant.addFlour();
  await restaurant.completeSetup();
  await page.goto("/orders?view=prepare");
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();

  const suggestions = page.getByRole("region", { name: "Vos recommandations d’achat" });
  await expect(suggestions.getByRole("status").filter({ hasText: "Horaires de service non renseignés." })).toBeVisible();
  await suggestions.getByRole("link", { name: "Vérifier les services et leurs cartes" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Services et carte" })).toBeVisible();
});

test("confirme les lignes revues quand le panier change après la validation", async ({ page, restaurant }) => {
  const { headers, addFlour, completeSetup } = restaurant;
  const { productId: flourId, supplierId } = await addFlour();
  await completeSetup();
  const rice = await page.request.post("/api/workspace/products", { headers, data: {
    operationId: randomUUID(), name: "Riz test", category: "Test", currentStock: 10,
    unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId,
  } });
  expect(rice.status()).toBe(201);
  const { id: riceId } = await rice.json() as { id: string };
  const flourItem = { id: randomUUID(), productId: flourId, productName: "Farine test", quantity: 1, unit: "kg", source: "stocks" };
  const riceItem = { ...flourItem, id: randomUUID(), productId: riceId, productName: "Riz test" };
  const addToCart = (items: (typeof flourItem)[]) => page.request.post("/api/workspace/cart", { headers, data: { action: "add", items } });
  expect((await addToCart([flourItem, riceItem])).status()).toBe(200);

  await page.route((url) => url.pathname === "/api/workspace/orders", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    // Another tab adds a product after the validated cart lines are removed.
    expect((await addToCart([riceItem])).status()).toBe(200);
    await route.fulfill({ response });
  });

  await page.goto("/orders?view=prepare#selection");
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  const review = page.getByRole("button", { name: "Vérifier et valider ma sélection" });
  await expect(review).toBeEnabled();
  await review.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Vérifier ma commande" });
  await expect(dialog.getByRole("spinbutton")).toHaveCount(2);
  await dialog.getByRole("spinbutton", { name: /Farine test/ }).fill("2");
  const refresh = page.waitForResponse((response) => response.url().endsWith("/workspace/cart") && response.request().method() === "GET");
  await dialog.getByRole("button", { name: "Valider la commande" }).press("Enter");
  await refresh;
  await expect(dialog.getByRole("heading", { name: "Commande enregistrée" })).toBeVisible();
  await page.keyboard.press("Escape");
  const selection = page.getByRole("region", { name: "Ma sélection" });
  await expect(selection.getByRole("listitem")).toHaveCount(1);
  await expect(selection.getByRole("listitem")).toContainText("Riz test");
});
