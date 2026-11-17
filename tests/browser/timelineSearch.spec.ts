import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("poursuit une recherche par étapes au clavier après une erreur sur mobile", async ({ page }) => {
  const password = "mot de passe du compte de test";
  const email = `historique-${randomUUID()}@example.test`;
  const registration = await page.request.post("/api/auth/register", { data: { displayName: "Historique test", email, password } });
  expect(registration.status()).toBe(201);
  const { user } = await registration.json() as { user: { id: string } };
  const headers = { "X-Expected-User-Id": user.id };

  try {
    const setup = await page.request.post("/api/setup", { data: {
      expectedUserId: user.id, name: "Restaurant test", type: "Restaurant", city: "Paris", address: "", phone: "", email, dailyCovers: 20,
    } });
    expect(setup.status()).toBe(201);
    const steps = ["team", "suppliers", "review", null] as const;
    for (const [index, expectedStep] of steps.slice(0, -1).entries()) {
      const step = await page.request.patch("/api/setup/step", { headers, data: {
        expectedUserId: user.id, expectedStep, nextStep: steps[index + 1], expectedRevision: index + 1,
      } });
      expect(step.status()).toBe(200);
    }

    const cursors: Array<string | null> = [];
    await page.route(/\/api\/workspace\/timeline\?/, async (route) => {
      const params = new URL(route.request().url()).searchParams;
      if (!params.get("q")) return route.fulfill({ json: { events: [], nextCursor: null } });
      const cursor = params.get("cursor");
      cursors.push(cursor);
      if (cursor === null) return route.fulfill({ json: { events: [], nextCursor: "premiere-etape" } });
      if (cursors.length === 2) return route.fulfill({ status: 503, json: {} });
      if (cursor === "premiere-etape") return route.fulfill({ json: { events: [], nextCursor: "deuxieme-etape" } });
      return route.fulfill({ json: { events: [{ id: "document:invoice:test", kind: "document", effectiveAt: "2023-04-02",
        knownAt: null, recordedAt: null, label: "Crème fraîche", detail: "Facture", provenance: "source" }], nextCursor: null } });
    });

    await page.goto("/history");
    await expect(page.getByRole("status").filter({ hasText: "Aucun événement pour ces dates." })).toBeVisible();
    await expect(page.getByLabel("Ouverture de KookiA")).toBeHidden();
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
  } finally {
    const cleanup = await page.request.delete("/api/account", { headers, data: { currentPassword: password } });
    expect(cleanup.status()).toBe(204);
  }
});
