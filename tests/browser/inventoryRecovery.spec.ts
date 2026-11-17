import { expect } from "@playwright/test";
import { test } from "./restaurantFixture";

test("reprend un inventaire sur mobile après la perte de la réponse de validation", async ({ page, restaurant }) => {
  const { headers, addFlour, completeSetup } = restaurant;
  const { productId } = await addFlour();
  await completeSetup();

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
});
