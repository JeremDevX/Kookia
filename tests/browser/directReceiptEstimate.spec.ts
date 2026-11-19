import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { addCalendarDays } from "../../shared/calendarDate";
import { formatParisDate } from "../../shared/parisDate";
import { test } from "./restaurantFixture";

test("ouvre le mouvement d’une réception directe depuis son estimation et revient à la même période", async ({ page, restaurant }) => {
  const { headers } = restaurant;
  const { productId, supplierId } = await restaurant.addFlour();
  await restaurant.completeSetup();

  const date = addCalendarDays(formatParisDate(), -2);
  const recipe = await page.request.post("/api/workspace/recipes", { headers, data: {
    operationId: randomUUID(), name: "Pain test", category: "Plat", prepTime: 15, yieldPortions: 4,
    effectiveFrom: date, ingredients: [{ productId, quantity: 0.8 }],
  } });
  expect(recipe.status()).toBe(201);
  const invoice = await page.request.post(`/api/workspace/invoices/${randomUUID()}`, { headers, data: {
    revision: 0, receive: true, draft: { reference: "FACT-DIRECTE", date, supplierId,
      lines: [{ productId, quantity: 8, unit: "kg", unitPrice: 1 }] },
  } });
  expect(invoice.status()).toBe(200);

  await page.goto(`/analytics?view=estimates&from=${date}&to=${date}`);
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  const table = page.getByRole("region", { name: "Sorties estimées des ingrédients" });
  const row = table.getByRole("row", { name: /FACT-DIRECTE/ });
  await expect(row).toContainText("Pain test");
  await expect(row).toContainText("36 portions");
  const source = row.getByRole("link", { name: /FACT-DIRECTE/ });
  await expect(source).toHaveAttribute("href", /^\/stocks\?/);
  await source.press("Enter");

  const movement = page.locator("[id^='stock-movement-']:focus");
  await expect(movement).toContainText("+8 kg");
  await movement.getByRole("link", { name: "Retour au Bilan (même période)" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Sorties estimées par recette" })).toBeFocused();
  await expect(page.getByLabel("Du", { exact: true })).toHaveValue(date);
  await expect(page.getByLabel("Au", { exact: true })).toHaveValue(date);
  await expect(row).toBeVisible();
});
