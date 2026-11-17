import { expect } from "@playwright/test";
import { test } from "./restaurantFixture";

test("recharge une fois les lots et les pertes après l’enregistrement", async ({ page, restaurant }) => {
  const { productId } = await restaurant.addFlour();
  await restaurant.completeSetup();

  let failLots = true;
  let failCatalog = false;
  await page.route("**/api/workspace/stock-lots", async (route) => {
    if (failLots) await route.fulfill({ status: 503, json: { error: { code: "TEST", message: "Lots indisponibles" } } });
    else await route.continue();
  });
  await page.route("**/api/workspace/catalog", async (route) => {
    if (failCatalog) await route.fulfill({ status: 503, json: { error: { code: "TEST", message: "Catalogue indisponible" } } });
    else await route.continue();
  });
  await page.goto("/stocks");
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  const section = page.getByRole("region", { name: "Lots et pertes" });
  const submit = section.getByRole("button", { name: "Confirmer la perte" });
  const loadError = section.getByRole("alert").filter({ hasText: "Lots et pertes indisponibles." });
  await expect(loadError).toBeVisible();
  await expect(submit).toBeDisabled();
  failLots = false;
  await loadError.getByRole("button", { name: "Réessayer" }).press("Enter");
  await expect(section.getByRole("heading", { name: "Lots et pertes" })).toBeFocused();
  await expect(section.getByText("Farine test : 10 kg · reçu date inconnue")).toBeVisible();

  const product = section.getByRole("combobox", { name: "Produit", exact: true });
  const quantity = section.getByRole("spinbutton", { name: "Quantité (kg)" });
  await product.selectOption(productId);
  await quantity.fill("1");

  const reads = new Map<string, number>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && /^\/api\/workspace\/(catalog|stock-lots|waste|productions)$/.test(path)) {
      reads.set(path, (reads.get(path) ?? 0) + 1);
    }
  });
  failCatalog = true;
  await submit.press("Enter");
  await expect(section.getByRole("status").filter({ hasText: "Perte enregistrée." })).toBeVisible();
  await expect(section.getByText("Farine test : 9 kg · reçu date inconnue")).toBeVisible();
  await expect(section.getByText(/Matière brute : 1 kg · matière déduite/)).toBeVisible();
  await expect(product).toHaveValue("");
  const catalogError = page.getByRole("alert").filter({ hasText: "Catalogue indisponible" });
  await expect(catalogError).toBeVisible();
  await expect(submit).toBeDisabled();
  for (const endpoint of ["catalog", "stock-lots", "waste", "productions"]) {
    expect(reads.get(`/api/workspace/${endpoint}`), endpoint).toBe(1);
  }
  failCatalog = false;
  await catalogError.getByRole("button", { name: "Réessayer" }).press("Enter");
  await expect(catalogError).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Voir la fiche Farine test" })).toBeVisible();
  await expect(submit).toBeEnabled();
  await expect(section.getByText("Perte enregistrée.")).toBeVisible();
  expect(reads.get("/api/workspace/stock-lots")).toBe(1);
});
