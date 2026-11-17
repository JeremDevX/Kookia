import { expect } from "@playwright/test";
import { test } from "./restaurantFixture";

test("poursuit une recherche par étapes au clavier après une erreur sur mobile", async ({ page, restaurant }) => {
  await restaurant.completeSetup();

  const cursors: Array<string | null> = [];
  let historyUnavailable = true;
  await page.route(/\/api\/workspace\/timeline\?/, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (!params.get("q")) return historyUnavailable
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({ json: { events: [], nextCursor: null } });
    const cursor = params.get("cursor");
    cursors.push(cursor);
    if (cursor === null) return route.fulfill({ json: { events: [], nextCursor: "premiere-etape" } });
    if (cursors.length === 2) return route.fulfill({ status: 503, json: {} });
    if (cursor === "premiere-etape") return route.fulfill({ json: { events: [], nextCursor: "deuxieme-etape" } });
    return route.fulfill({ json: { events: [{ id: "document:invoice:test", kind: "document", effectiveAt: "2023-04-02",
      knownAt: null, recordedAt: null, label: "Crème fraîche", detail: "Facture", provenance: "source" }], nextCursor: null } });
  });

  await page.goto("/history");
  await expect(page.getByLabel("Ouverture de KookiA")).toBeHidden();
  const retryHistory = page.getByRole("button", { name: "Réessayer" });
  await expect(retryHistory).toBeVisible();
  await retryHistory.focus();
  await expect(retryHistory).toBeFocused();
  const failedRetry = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/workspace/timeline" && response.status() === 503);
  await retryHistory.press("Enter");
  await failedRetry;
  await expect(retryHistory).toBeFocused();
  historyUnavailable = false;
  await retryHistory.press("Enter");
  await expect(page.getByRole("heading", { name: "Historique", level: 1 })).toBeFocused();

  await expect(page.getByRole("status").filter({ hasText: "Aucun événement pour ces dates." })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Rechercher dans l’historique" });
  await search.fill("crème");
  await expect(page).toHaveURL((url) => url.searchParams.get("qDraft") === "crème");
  await search.press("Enter");
  await expect(page.getByText("Aucun résultat dans la partie parcourue.")).toBeVisible();
  expect(cursors).toEqual([null]);

  const proceed = page.getByRole("button", { name: "Poursuivre la recherche" });
  for (let tab = 0; tab < 3; tab++) await page.keyboard.press("Tab");
  await expect(proceed).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Impossible de charger la suite de l’historique." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(proceed).toBeFocused();
  expect(cursors).toEqual([null, "premiere-etape", "premiere-etape"]);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Crème fraîche" })).toBeVisible();
  await expect(page.locator(".timeline-status")).toBeFocused();
  await expect(proceed).toHaveCount(0);
  expect(cursors).toEqual([null, "premiere-etape", "premiere-etape", "deuxieme-etape"]);
});
