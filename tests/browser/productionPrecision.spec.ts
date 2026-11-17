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

  await page.goto("/recipes?view=anti-waste");
  await expect(page.getByText("Jusqu’à 4 portions avec les lots proposés")).toBeVisible();
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
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

  const movements = await page.request.get(`/api/workspace/products/${productId}/movements`, { headers });
  expect(movements.ok()).toBe(true);
  expect(await movements.json()).toContainEqual(expect.objectContaining({ delta: -0.001, reason: "production" }));
});
