import { expect } from "@playwright/test";
import { serviceSlots, type CalendarService } from "../../shared/serviceCalendar";
import { test } from "./restaurantFixture";

test("conserve le bon service quand une lecture précédente arrive en retard", async ({ page, restaurant }) => {
  await restaurant.completeSetup();
  const olderDate = "2025-05-04";
  const selectedDate = "2025-05-05";
  const reads: string[] = [];
  const olderRead = Promise.withResolvers<void>();
  const calendarPath = "/api/workspace/services/calendar";
  const isCalendarRead = (method: string, url: string, date: string) => {
    const request = new URL(url);
    return method === "GET" && request.pathname === calendarPath && request.searchParams.get("from") === date;
  };

  await page.route((url) => url.pathname === calendarPath, async (route) => {
    const { searchParams } = new URL(route.request().url());
    const serviceDate = searchParams.get("from");
    if (route.request().method() !== "GET" || (serviceDate !== olderDate && serviceDate !== selectedDate)) return route.continue();
    reads.push(serviceDate);
    if (serviceDate === olderDate) await olderRead.promise;
    const services: CalendarService[] = serviceSlots.map((slot) => ({
      serviceDate, slot, plannedOpen: slot === "dinner", opensAt: null, closesAt: null,
      exceptional: false, coverage: "missing", actualCovers: null,
      note: serviceDate === olderDate ? "Ancienne date" : slot === "lunch" ? "Midi sélectionné" : "Soir sélectionné",
      revision: 0, soldQuantity: 0, unallocatedQuantity: 0, allocationNeedsReview: false, excludedSimulationQuantity: 0,
    }));
    return route.fulfill({ json: services });
  });

  try {
    await page.goto("/sales");
    const editor = page.getByRole("region", { name: "Services midi et soir" });
    const date = editor.getByLabel("Date", { exact: true });
    const slot = editor.getByRole("combobox", { name: "Service", exact: true });
    const note = editor.getByLabel("Motif / contexte, sans donnée personnelle");
    const opening = editor.getByRole("combobox", { name: "Ouverture prévue", exact: true });
    const save = editor.getByRole("button", { name: "Enregistrer le service" });
    await expect(save).toBeEnabled();
    await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();

    const pending = page.waitForRequest((request) => isCalendarRead(request.method(), request.url(), olderDate));
    await date.fill(olderDate);
    await pending;
    await expect(editor.getByRole("button", { name: "Chargement…" })).toBeDisabled();
    await expect(note).toBeDisabled();

    await date.fill(selectedDate);
    await expect(note).toHaveValue("Midi sélectionné");
    const olderResponse = page.waitForResponse((response) => isCalendarRead(response.request().method(), response.url(), olderDate));
    olderRead.resolve();
    await (await olderResponse).finished();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(note).toHaveValue("Midi sélectionné");

    await slot.selectOption("dinner");
    await expect(note).toHaveValue("Soir sélectionné");
    await expect(opening).toHaveValue("open");
    expect(reads).toEqual([olderDate, selectedDate]);

    await note.fill("Note du chef pour le soir");
    await expect(note).toHaveValue("Note du chef pour le soir");
    await expect(save).toBeEnabled();
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === calendarPath && response.request().method() === "PUT");
    await save.press("Enter");
    const response = await saved;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toMatchObject({
      serviceDate: selectedDate, slot: "dinner", plannedOpen: true, note: "Note du chef pour le soir", expectedRevision: 0,
    });
    await expect(editor.getByRole("status").filter({ hasText: "Service enregistré." })).toBeVisible();
  } finally {
    olderRead.resolve();
  }
});

test("suspend les saisies pendant le rechargement de la fiche de service", async ({ page, restaurant }) => {
  await restaurant.completeSetup();
  await page.goto("/services");
  const sheet = page.getByRole("region", { name: "Fiche de service" });
  const reload = sheet.getByRole("button", { name: "Recharger le constat enregistré" });
  const plannedPortions = sheet.getByRole("spinbutton", { name: "Portions prévues" });
  const fields = [
    ...["Recette", "Recette remplacée", "Recette retenue"].map((name) => sheet.getByRole("combobox", { name, exact: true })),
    plannedPortions,
    sheet.getByRole("spinbutton", { name: "Portions remplacées" }),
    sheet.getByRole("textbox", { name: "Explication" }),
  ];
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  await expect(fields[0]).toBeEnabled();

  const release = Promise.withResolvers<void>();
  await page.route((url) => url.pathname === "/api/workspace/services/sheet", async (route) => {
    await release.promise;
    await route.continue();
  }, { times: 1 });
  try {
    await reload.press("Enter");
    await expect(sheet.getByRole("status").filter({ hasText: "Chargement / enregistrement…" })).toBeVisible();
    for (const field of fields) await expect(field).toBeDisabled();
  } finally {
    release.resolve();
  }
  for (const field of fields) await expect(field).toBeEnabled();
  await plannedPortions.fill("4");
  await expect(plannedPortions).toHaveValue("4");
});
