import { expect } from "@playwright/test";
import { test } from "./restaurantFixture";

test("rend le focus au tiroir après un comptage au clavier sur mobile", async ({ page, restaurant }) => {
  await restaurant.addFlour();
  await restaurant.completeSetup();

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
});
