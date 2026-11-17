import { expect, test } from "@playwright/test";

test("garde l’accueil pendant la vérification puis rend la connexion accessible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let finishSession!: () => void;
  const session = new Promise<void>((resolve) => { finishSession = resolve; });
  await page.route("**/api/auth/me", async (route) => {
    await session;
    await route.fulfill({ status: 401, json: {} });
  });
  await page.clock.install();
  await page.goto("/login");
  const splash = page.getByRole("status", { name: "Ouverture de KookiA" });
  await expect(splash).toContainText("Vérification de votre session…");
  await page.clock.runFor(1500);
  await expect(splash).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("[inert] :focus")).toHaveCount(0);
  finishSession();
  await expect(splash).toContainText("Ouverture de votre espace…");
  await page.clock.runFor(400);
  await expect(splash).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Email" })).toBeFocused();
});

test("respecte les mouvements réduits sur petit téléphone sans attente décorative", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let finishSession!: () => void;
  const session = new Promise<void>((resolve) => { finishSession = resolve; });
  await page.route("**/api/auth/me", async (route) => {
    await session;
    await route.fulfill({ status: 401, json: {} });
  });
  await page.clock.install();
  await page.goto("/login");
  await expect(page.locator(".splash-mark")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".splash-loader span").first()).toHaveCSS("animation-name", "none");
  const bounds = await page.locator(".splash-content").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
  finishSession();
  await expect(page.locator(".splash-screen")).toContainText("Ouverture de votre espace…");
  await page.clock.runFor(10);
  await expect(page.locator(".splash-screen")).toHaveCount(0);
});

test("laisse réessayer au clavier après une session indisponible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let unavailable = true;
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: unavailable ? 503 : 401, json: {} }));
  await page.goto("/login");
  await expect(page.locator(".splash-screen")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Impossible de vérifier votre session" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeFocused();
  unavailable = false;
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
});
