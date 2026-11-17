import { expect } from "@playwright/test";
import { addCalendarDays } from "../../shared/calendarDate";
import { formatParisDate } from "../../shared/parisDate";
import type { ServiceDay } from "../../src/services/salesService";
import { test } from "./restaurantFixture";

const calendarPath = "/api/workspace/sales/service-days";
const calendarLabel = "Calendrier des services";
const disclosureLabel = "Couverture quotidienne historique (non ventilée)";
const tableLabel = "Jours de service sur la période";

test("charge le calendrier à l’ouverture et permet de réessayer au clavier", async ({ page, restaurant }) => {
  await restaurant.completeSetup();
  let reads = 0;
  let unavailable = true;
  await page.route((url) => url.pathname === calendarPath, (route) => {
    reads++;
    if (unavailable) return route.fulfill({ status: 503, json: {
      error: { code: "UNAVAILABLE", message: "Calendrier indisponible." },
    } });
    return route.continue();
  });

  await page.goto("/sales");
  await expect(page.getByText("Aucune vente enregistrée sur cette période.")).toBeVisible();
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  expect(reads).toBe(0);

  const disclosure = page.getByText(disclosureLabel, { exact: true });
  await disclosure.press("Enter");
  const editor = page.getByRole("region", { name: calendarLabel });
  const table = editor.getByRole("region", { name: tableLabel });
  await expect(editor.getByRole("alert")).toContainText("Calendrier indisponible.");
  await expect(table).toBeHidden();

  unavailable = false;
  await editor.getByRole("button", { name: "Réessayer" }).press("Enter");
  await expect(table).toBeVisible();
  await expect(editor.getByRole("alert")).toBeHidden();
  await expect(editor.getByRole("heading", { name: calendarLabel })).toBeFocused();
  await table.press("ArrowRight");
  expect(await table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("garde la révision de la période courante quand une ancienne lecture arrive en retard", async ({ page, restaurant }) => {
  await restaurant.completeSetup();
  const today = formatParisDate();
  const olderFrom = addCalendarDays(today, -29);
  const selectedFrom = addCalendarDays(today, -2);
  const savedDay = await page.request.put(`${calendarPath}/${today}`, { headers: restaurant.headers,
    data: { expectedRevision: 0, status: "closed", coverage: "complete" },
  });
  expect(savedDay.ok()).toBe(true);
  const staleDay = { ...await savedDay.json() as ServiceDay, status: "open", coverage: "partial", revision: 0 };
  const olderRead = Promise.withResolvers<void>();
  const isOlderRead = (url: string) => {
    const requestUrl = new URL(url);
    return requestUrl.pathname === calendarPath && requestUrl.searchParams.get("from") === olderFrom;
  };
  await page.route(isOlderRead, async (route) => {
    await olderRead.promise;
    return route.fulfill({ json: [staleDay] });
  });

  try {
    const pending = page.waitForRequest((request) => isOlderRead(request.url()));
    await page.goto("/sales");
    await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
    await page.getByText(disclosureLabel, { exact: true }).click();
    await pending;

    const editor = page.getByRole("region", { name: calendarLabel });
    const save = editor.getByRole("button", { name: "Enregistrer l’état du service" });
    await expect(save).toBeDisabled();
    await page.getByRole("region", { name: "Historique enregistré" }).getByLabel("Du", { exact: true }).fill(selectedFrom);
    const savedRow = editor.getByRole("row").filter({ hasText: today });
    await expect(savedRow.getByRole("cell", { name: "Fermé", exact: true })).toBeVisible();
    const olderResponse = page.waitForResponse((response) => isOlderRead(response.url()));
    olderRead.resolve();
    await (await olderResponse).finished();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(savedRow.getByRole("cell", { name: "Fermé", exact: true })).toBeVisible();

    await editor.getByRole("combobox", { name: "État du restaurant" }).selectOption("open");
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === `${calendarPath}/${today}`
      && response.request().method() === "PUT");
    await save.press("Enter");
    const response = await saved;
    expect(response.request().postDataJSON()).toMatchObject({ expectedRevision: 1, status: "open", coverage: "complete" });
    expect(response.ok()).toBe(true);
    await expect(savedRow.getByRole("cell", { name: "0 observé" })).toBeVisible();
    await expect(save).toBeFocused();
  } finally {
    olderRead.resolve();
  }
});
