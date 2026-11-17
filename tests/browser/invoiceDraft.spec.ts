import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { formatParisDate } from "../../shared/parisDate";
import { test } from "./restaurantFixture";

test.use({ timezoneId: "Europe/Paris" });

test("ouvre un brouillon vierge, recharge un conflit et retrouve une facture enregistrée", async ({ page, restaurant }) => {
  const { headers, completeSetup } = restaurant;
  await completeSetup();
  const invoiceId = randomUUID();
  const now = new Date();
  const date = formatParisDate(now);
  await page.clock.setFixedTime(now);
  const saveExisting = (revision: number, reference: string) => page.request.post(`/api/workspace/invoices/${invoiceId}`, {
    headers, data: { revision, receive: false, draft: { reference, date, lines: [] } },
  });
  const existing = await saveExisting(0, "FACT-EXISTANTE");
  expect(existing.status()).toBe(200);
  const { revision } = await existing.json() as { revision: number };

  const invoiceList = (url: URL) => url.pathname === "/api/workspace/invoices";
  await page.route(invoiceList, (route) => route.abort("failed"));
  await page.goto("/orders?view=invoices");
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  const open = page.getByRole("button", { name: "Saisir manuellement" });
  const dialog = page.getByRole("dialog", { name: "Revoir une facture" });
  const history = dialog.getByLabel("Factures enregistrées");
  const reference = dialog.getByLabel("Référence");
  const save = dialog.getByRole("button", { name: "Enregistrer le brouillon" });

  await open.press("Enter");
  const retry = dialog.getByRole("button", { name: "Recharger les factures" });
  await expect(retry).toBeVisible();
  await page.unroute(invoiceList);
  await retry.press("Enter");
  await expect(history).toBeFocused();
  await expect(history).toHaveValue("");
  await expect(reference).toHaveValue("");
  await expect(dialog.getByLabel("Date de facture")).toHaveValue(date);
  await history.selectOption(invoiceId);
  await expect(reference).toHaveValue("FACT-EXISTANTE");

  expect((await saveExisting(revision, "FACT-ACTUALISÉE")).status()).toBe(200);
  await reference.fill("FACT-LOCALE");
  await save.press("Enter");
  await dialog.getByRole("button", { name: "Charger la version enregistrée" }).press("Enter");
  await expect(history).toBeFocused();
  await expect(history).toHaveValue(invoiceId);
  await expect(reference).toHaveValue("FACT-ACTUALISÉE");

  await dialog.getByRole("button", { name: "Nouvelle facture manuelle" }).press("Enter");
  await expect(reference).toHaveValue("");
  await reference.fill("FACT-MANUELLE");
  await save.press("Enter");
  await expect(dialog.getByText("Brouillon enregistré.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();

  await open.press("Enter");
  await expect(reference).toHaveValue("");
  await history.selectOption({ label: "FACT-MANUELLE · Brouillon" });
  await expect(reference).toHaveValue("FACT-MANUELLE");
});
