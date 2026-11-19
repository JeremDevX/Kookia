import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { formatParisDate } from "../../shared/parisDate";
import { test } from "./restaurantFixture";

test("réceptionne 0,1 puis 0,2 kg et ouvre le mouvement de stock sur mobile", async ({ page, restaurant }) => {
  const { headers, addFlour, completeSetup } = restaurant;
  const { productId, supplierId } = await addFlour(0.1);
  await completeSetup();

  const order = await page.request.post("/api/workspace/orders", { headers, data: {
    operationId: randomUUID(), lines: [{ productId, quantity: 0.3 }],
  } });
  expect(order.status()).toBe(201);
  const { id: orderId } = await order.json() as { id: string };
  for (let index = 0; index < 10; index++) {
    const newer = await page.request.post("/api/workspace/orders", { headers, data: {
      operationId: randomUUID(), lines: [{ productId, quantity: 0.3 }],
    } });
    expect(newer.status()).toBe(201);
  }
  const invoiceId = randomUUID();
  const date = formatParisDate();
  const invoice = await page.request.post(`/api/workspace/invoices/${invoiceId}`, { headers, data: {
    revision: 0, receive: false, draft: { reference: "FACT-300", date, supplierId,
      lines: [{ productId, quantity: 0.3, unit: "kg", unitPrice: 1 }] },
  } });
  expect(invoice.status()).toBe(200);
  const excessiveInvoiceId = randomUUID();
  const excessiveInvoice = await page.request.post(`/api/workspace/invoices/${excessiveInvoiceId}`, { headers, data: {
    revision: 0, receive: false, draft: { reference: "FACT-400", date, supplierId,
      lines: [{ productId, quantity: 0.4, unit: "kg", unitPrice: 1 }] },
  } });
  expect(excessiveInvoice.status()).toBe(200);

  const reconciliationRequests: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/reconciliation") || path.endsWith("/inventory-session/context")) reconciliationRequests.push(path);
  });
  const historyUrl = `/orders?view=orders#order-${orderId}`;
  const orderCard = page.locator(`#order-${orderId}`);
  await page.goto(historyUrl);
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  await expect(orderCard.locator(":scope > summary")).toBeFocused();
  expect(reconciliationRequests).toEqual([]);
  const pagination = page.getByRole("navigation", { name: "Pages des commandes" });
  await expect(pagination.getByRole("status")).toHaveText("Page 1 sur 2");
  await page.route((url) => url.pathname === "/api/workspace/orders" && url.searchParams.get("page") === "1",
    (route) => route.abort("failed"), { times: 1 });
  await pagination.getByRole("button", { name: "Suivant" }).press("Enter");
  const retry = page.getByRole("alert").filter({ hasText: "Historique des commandes indisponible" }).getByRole("button", { name: "Réessayer" });
  await expect(retry).toBeFocused();
  await retry.press("Enter");
  await expect(pagination.getByRole("status")).toHaveText("Page 2 sur 2");
  await expect(page.getByRole("heading", { name: "Suivre vos commandes" })).toBeFocused();
  const reconciliation = orderCard.getByText("Chaîne commande → livraison → facture → avoir", { exact: true });
  await reconciliation.press("Enter");
  await expect(orderCard.getByText("Aucune livraison rapprochée pour cette commande.")).toBeVisible();
  expect(reconciliationRequests).toEqual([`/api/workspace/orders/${orderId}/reconciliation`]);

  const review = orderCard.getByText("Rapprocher une facture et une livraison", { exact: true });
  const quantity = orderCard.getByRole("spinbutton", { name: "Quantité réellement livrée" });
  const receiptReference = orderCard.getByLabel("Référence du bon de livraison");
  const submit = orderCard.getByRole("button", { name: "Rapprocher et ajouter au stock" });
  await review.press("Enter");
  await orderCard.getByLabel("Facture revue").selectOption(excessiveInvoiceId);
  await expect(quantity).toHaveValue("0.3");
  await receiptReference.fill("BL-400");
  await expect(orderCard.getByText(/La quantité facturée dépasse la quantité commandée/)).toBeVisible();
  await expect(submit).toBeDisabled();

  await orderCard.getByLabel("Facture revue").selectOption(invoiceId);
  await expect(orderCard.getByText(/La quantité facturée dépasse la quantité commandée/)).toHaveCount(0);
  await expect(quantity).toHaveValue("0.3");
  await quantity.fill("0.1");
  await receiptReference.fill("BL-100");
  await submit.press("Enter");
  await expect(orderCard.getByText("Réception partielle", { exact: false }).first()).toBeVisible();
  await expect(orderCard.getByRole("cell", { name: /^0\.2 kg/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  await review.press("Enter");
  await orderCard.getByLabel("Facture revue").selectOption(invoiceId);
  await expect(quantity).toHaveValue("0.2");
  await receiptReference.fill("BL-200");
  await quantity.fill("0.201");
  await expect(submit).toBeDisabled();
  await quantity.fill("0.2");
  await expect(submit).toBeEnabled();
  await submit.press("Enter");
  await expect(orderCard.getByText("Entièrement réceptionnée")).toBeVisible();
  const lastReceipt = orderCard.getByRole("article").filter({ has: page.getByRole("heading", { name: "BL-200" }) });
  const movements = await page.request.get(`/api/workspace/products/${productId}/movements`, { headers });
  expect(movements.status()).toBe(200);
  const credits = (await movements.json() as { reason: string; id: string; delta: number }[]).filter((movement) => movement.reason === "purchase_receipt");
  expect(credits.map((movement) => movement.delta).sort()).toEqual([0.1, 0.2]);
  const movement = credits.find(({ delta }) => delta === 0.2)!;
  const receiptAnchor = await lastReceipt.getAttribute("id");
  expect(receiptAnchor).toMatch(/^receipt-/);
  const fromBilan = new URLSearchParams({ receiptId: receiptAnchor!.slice(8), from: date, to: date, returnAnchor: "impact-summary-title" });
  await page.goto(`/orders?${fromBilan}#${receiptAnchor}`);
  await expect(page.getByRole("status", { name: "Ouverture de KookiA" })).toBeHidden();
  await expect(lastReceipt.getByRole("heading", { name: "BL-200" })).toBeFocused();
  await expect(lastReceipt.getByRole("link", { name: "Retour au Bilan (même période)" })).toBeVisible();
  const movementLink = lastReceipt.getByRole("link", { name: /Voir le mouvement de stock/ });
  await expect(movementLink).toHaveAttribute("href", new RegExp(`#stock-movement-${movement.id}$`));
  await movementLink.click();
  await expect(page.locator(`#stock-movement-${movement.id}`)).toBeFocused();
  await expect(page.locator(`#stock-movement-${movement.id}`)).toContainText("+0.2 kg");
});
