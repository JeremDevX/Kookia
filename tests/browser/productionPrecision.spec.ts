import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { formatParisDate } from "../../shared/parisDate";
import { test } from "./restaurantFixture";

test.use({ timezoneId: "Europe/Paris" });

test("produit le maximum annoncé quand un dosage est arrondi au millième", async ({ page, restaurant }) => {
  const { headers, completeSetup } = restaurant;
  const supplierId = randomUUID();
  const supplier = await page.request.post("/api/workspace/suppliers", { headers, data: {
    id: supplierId, name: "Fournisseur test", email: "fournisseur@example.test", phone: "",
  } });
  expect(supplier.status()).toBe(201);
  const product = await page.request.post("/api/workspace/products", { headers, data: {
    operationId: randomUUID(), name: "Épice test", category: "Test", currentStock: 0.001,
    unit: "kg", minThreshold: 0, pricePerUnit: 1, supplierId,
  } });
  expect(product.status()).toBe(201);
  const { id: productId } = await product.json() as { id: string };
  const now = new Date();
  await page.clock.setFixedTime(now);
  const recipe = await page.request.post("/api/workspace/recipes", { headers, data: {
    operationId: randomUUID(), name: "Assaisonnement test", category: "Plat", prepTime: 1, yieldPortions: 3,
    effectiveFrom: formatParisDate(now), ingredients: [{ productId, quantity: 0.001 }],
  } });
  expect(recipe.status()).toBe(201);
  await completeSetup();

  let journalReads = 0;
  await page.route("**/api/workspace/productions", async (route) => {
    if (route.request().method() === "GET" && ++journalReads === 1) {
      await route.fulfill({ status: 503, json: { error: { code: "TEST", message: "Journal indisponible" } } });
    } else await route.continue();
  });
  await page.goto("/recipes");
  await expect(page.getByText("Assaisonnement test", { exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  await page.getByRole("button", { name: "Fiches techniques" }).click();
  await expect(page.getByRole("heading", { name: "Fiches techniques", level: 1 })).toBeVisible();
  expect(journalReads).toBe(0);

  await page.getByRole("button", { name: "Réalisables avec le stock" }).press("Enter");
  const journalError = page.getByRole("alert").filter({ hasText: "Historique de production indisponible." });
  await expect(journalError).toBeVisible();
  await journalError.getByRole("button", { name: "Réessayer" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Mes recettes", level: 1 })).toBeFocused();
  await expect(page.getByText("Jusqu’à 4 portions avec les lots proposés")).toBeVisible();
  await expect(journalError).toHaveCount(0);
  const produce = page.getByRole("button", { name: "Produire cette recette" });
  await produce.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Produire une recette" });
  const portions = dialog.getByRole("spinbutton", { name: "Portions à produire" });
  const confirm = dialog.getByRole("button", { name: "Confirmer et déduire du stock" });
  await portions.fill("1");
  await expect(confirm).toBeDisabled();
  await portions.fill("4");
  await expect(dialog.getByText("0.001 kg", { exact: true })).toBeVisible();
  await confirm.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(produce).toBeHidden();

  await page.getByRole("button", { name: "Produites cette semaine" }).click();
  await expect(page.getByRole("region", { name: "Journal de production" }).getByText("Assaisonnement test", { exact: true })).toBeVisible();
  await expect(page.getByText("Chargement de l’historique de production…")).toBeHidden();
  expect(journalReads).toBe(3);

  const movements = await page.request.get(`/api/workspace/products/${productId}/movements`, { headers });
  expect(movements.ok()).toBe(true);
  expect(await movements.json()).toContainEqual(expect.objectContaining({ delta: -0.001, reason: "production" }));
});
