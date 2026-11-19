import { expect } from "@playwright/test";
import { test } from "./restaurantFixture";

test("protège les ingrédients importés et conserve la saisie si le chef reste", async ({ page, restaurant }) => {
  const { productId } = await restaurant.addFlour();
  await restaurant.completeSetup();
  await page.goto("/recipes");
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  const importRecipe = page.getByRole("button", { name: "Importer une fiche CSV" });
  await expect(importRecipe).toBeEnabled();
  await importRecipe.press("Enter");
  await page.getByLabel("Choisir un fichier CSV").setInputFiles({
    name: "fiche.csv", mimeType: "text/csv", buffer: Buffer.from("produit;quantité;unité\nFarine test;2;kg\n"),
  });
  const openMapping = page.getByRole("button", { name: "Associer les colonnes" });
  await expect(openMapping).toBeEnabled();
  await openMapping.press("Enter");
  const columns = page.getByRole("group", { name: "Colonnes du fichier" });
  await columns.getByRole("combobox", { name: "Produit", exact: true }).selectOption("0");
  await columns.getByRole("combobox", { name: "Quantité brute", exact: true }).selectOption("1");
  await columns.getByRole("combobox", { name: "Unité", exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Associer les produits" }).press("Enter");
  await page.getByRole("combobox", { name: "Produit du catalogue" }).selectOption(productId);
  await page.getByRole("button", { name: "Revoir dans l’éditeur" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Revoir la fiche importée" })).toBeFocused();

  const leave = async (confirm: boolean) => {
    await page.getByRole("button", { name: "Ouvrir le menu" }).press("Enter");
    const dialogPromise = page.waitForEvent("dialog").then(async (dialog) => {
      const message = dialog.message();
      if (confirm) await dialog.accept();
      else await dialog.dismiss();
      expect(message).toContain("La recette n’est pas enregistrée");
    });
    await Promise.all([page.getByRole("link", { name: "KookIA — accueil" }).press("Enter"), dialogPromise]);
  };

  await leave(false);
  await expect(page.getByRole("spinbutton", { name: "Quantité brute (kg)" })).toHaveValue("2");
  const name = page.getByRole("textbox", { name: "Nom de la recette" });
  await name.fill("Pain de campagne");
  await page.getByRole("button", { name: "Fiches techniques" }).press("Enter");
  await expect(name).toHaveValue("Pain de campagne");

  await leave(true);
  await expect(page).toHaveURL(/\/$/);
  await expect(name).toHaveCount(0);

  await page.goto("/recipes");
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  await page.getByRole("button", { name: "Nouvelle recette" }).press("Enter");
  await name.fill("Autre brouillon");
  await leave(false);
  await expect(name).toHaveValue("Autre brouillon");
});
