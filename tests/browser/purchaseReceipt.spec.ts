import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { formatParisDate } from "../../shared/parisDate";

test("réceptionne 0,1 puis 0,2 kg et ouvre le mouvement de stock sur mobile", async ({ page }) => {
  const password = "mot de passe du compte de test";
  const email = `reception-${randomUUID()}@example.test`;
  const createAccount = await page.request.post("/api/auth/register", { data: { displayName: "Réception test", email, password } });
  expect(createAccount.status()).toBe(201);
  const { user } = await createAccount.json() as { user: { id: string } };
  const headers = { "X-Expected-User-Id": user.id };
  try {
    const setup = await page.request.post("/api/setup", { data: {
      expectedUserId: user.id, name: "Restaurant test", type: "Restaurant", city: "Paris", address: "", phone: "", email, dailyCovers: 20,
    } });
    expect(setup.status()).toBe(201);
    const supplierId = randomUUID();
    const supplier = await page.request.post("/api/workspace/suppliers", { headers, data: { id: supplierId, name: "Fournisseur test", email, phone: "" } });
    expect(supplier.status()).toBe(201);
    const product = await page.request.post("/api/workspace/products", { headers, data: {
      operationId: randomUUID(), name: "Farine test", category: "Test", currentStock: 10,
      unit: "kg", minThreshold: 1, pricePerUnit: 1, orderPackQuantity: 0.1, supplierId,
    } });
    expect(product.status()).toBe(201);
    const { id: productId } = await product.json() as { id: string };
    const steps = ["team", "suppliers", "review", null] as const;
    for (const [index, expectedStep] of steps.slice(0, -1).entries()) {
      const step = await page.request.patch("/api/setup/step", { headers, data: {
        expectedUserId: user.id, expectedStep, nextStep: steps[index + 1], expectedRevision: index + 1,
      } });
      expect(step.status()).toBe(200);
    }
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
    await orderCard.getByLabel("Facture revue").selectOption(invoiceId);
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
  } finally {
    const cleanup = await page.request.delete("/api/account", { headers, data: { currentPassword: password } });
    expect(cleanup.status()).toBe(204);
  }
});
