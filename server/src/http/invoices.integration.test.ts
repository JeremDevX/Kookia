import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: "Invoice test", email: `invoice-${randomUUID()}@example.com`, password: "invoice test password" }).expect(201);
  users.push(response.body.user.id);
  agent.set("X-Expected-User-Id", response.body.user.id);
  await ensureWorkspace(response.body.user.id); return agent;
}
it("persists corrected drafts, isolates accounts and receives invoices exactly once", async () => {
  const agent = await account(); const other = await account();
  await request(app).get("/api/workspace/invoices").expect(401);
  const originals = await agent.get("/api/workspace/invoices").expect(200);
  expect(originals.body).toEqual([]);
  const catalog = await agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products[0];
  const id = randomUUID();
  const draft = { reference: "Manual invoice", date: "2026-09-11", lines: [{ productId: product.id, quantity: 4.5, unitPrice: 2 }] };
  const saved = await agent.post(`/api/workspace/invoices/${id}`).send({ draft, revision: 0, receive: false }).expect(200);
  const corrected = { ...draft, lines: [{ ...draft.lines[0], quantity: 5.5 }] };
  const updated = await agent.post(`/api/workspace/invoices/${id}`).send({ draft: corrected, revision: saved.body.revision, receive: false }).expect(200);
  await agent.post(`/api/workspace/invoices/${id}`).send({ draft, revision: saved.body.revision, receive: false }).expect(409);
  const isolated = await other.get("/api/workspace/invoices").expect(200);
  expect(isolated.body.some((item: { id: string }) => item.id === id)).toBe(false);
  const unchanged = await agent.get("/api/workspace/catalog").expect(200);
  expect(unchanged.body).toEqual(catalog.body);
  const receipt = { draft: corrected, revision: updated.body.revision, receive: true };
  const results = await Promise.all([agent.post(`/api/workspace/invoices/${id}`).send(receipt), agent.post(`/api/workspace/invoices/${id}`).send(receipt)]);
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  const after = await agent.get("/api/workspace/catalog").expect(200);
  const receivedProduct = after.body.products.find((item: { id: string }) => item.id === product.id);
  expect(receivedProduct.currentStock).toBe(product.currentStock + 5.5);
  expect(receivedProduct.stockRevision).toBe(product.stockRevision + 1);
  await agent.post(`/api/workspace/invoices/${id}`).send({ draft, revision: results[0].body.revision, receive: false }).expect(409);
  const history = await agent.get(`/api/workspace/products/${product.id}/movements`).expect(200);
  expect(history.body.filter((item: { reason: string }) => item.reason === "receipt")).toHaveLength(1);
  await agent.post(`/api/workspace/invoices/${randomUUID()}`).send({ draft: { ...draft, reference: "Invalid product invoice", lines: [...draft.lines, { productId: "zzmissing", quantity: 2, unitPrice: 1 }] }, revision: 0, receive: true }).expect(400);
  const rollback = await agent.get("/api/workspace/catalog").expect(200);
  expect(rollback.body).toEqual(after.body);
  const reread = await agent.get("/api/workspace/invoices").expect(200);
  expect(reread.body.find((item: { id: string }) => item.id === id).status).toBe("received");
});

it("vérifie l’unité renseignée avant de créditer une facture manuelle", async () => {
  const agent = await account();
  const catalog = (await agent.get("/api/workspace/catalog").expect(200)).body;
  const product = catalog.products[0];
  const draft = { reference: "Unit test", date: "2026-09-11", lines: [{ productId: product.id, quantity: 1, unitPrice: 2, unit: product.unit === "kg" ? "L" : "kg" }] };
  const result = await agent.post(`/api/workspace/invoices/${randomUUID()}`).send({ draft, revision: 0, receive: true }).expect(409);
  expect(result.body.error.code).toBe("UNIT_MISMATCH");
  expect((await agent.get("/api/workspace/catalog").expect(200)).body).toEqual(catalog);
  draft.lines[0].unit = product.unit;
  await agent.post(`/api/workspace/invoices/${randomUUID()}`).send({ draft, revision: 0, receive: true }).expect(200);
});

it("lists source invoices only within the authenticated restaurant", async () => {
  const owner = await account();
  const other = await account();
  await owner.get("/api/workspace/catalog").expect(200);
  const userId = (await owner.get("/api/auth/me").expect(200)).body.user.id as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { restaurant: true } });
  const id = "abcdef0123456789abcdef01";
  const transcript = ["- Date décalée de la pièce (démonstration) : 2026-09-23",
    "- Date (pièce d’origine) : 2021-12-30", "- Fournisseur : Fournisseur de test"].join("\n");
  await prisma.workspaceDocument.create({ data: { restaurantId: user.restaurant!.id, kind: `source-invoice:${id}`,
    data: { id, contentHash: "a".repeat(64), title: "Pièce de test", date: "2026-09-23", originalDate: "2021-12-30",
      supplier: "Fournisseur de test", type: "invoice", status: "À vérifier", content: transcript, stockLines: [] } } });

  await request(app).get("/api/workspace/source-invoices").expect(401);
  const list = await owner.get("/api/workspace/source-invoices").expect(200);
  expect(list.body).toEqual([expect.objectContaining({ id, title: "Pièce de test", stockLineCount: 0 })]);
  expect(list.body[0]).not.toHaveProperty("content");
  expect(list.body[0]).not.toHaveProperty("originalDate");
  const detail = (await owner.get(`/api/workspace/source-invoices/${id}`).expect(200)).body;
  expect(detail.content).toContain("- Date de travail : 2026-09-23");
  expect(detail.content).not.toContain("2021-12-30");
  expect(detail.content).not.toContain("démonstration");
  expect((await other.get("/api/workspace/source-invoices").expect(200)).body).toEqual([]);
  await other.get(`/api/workspace/source-invoices/${id}`).expect(404);
  await owner.get("/api/workspace/source-invoices/invalid-id").expect(400);
});


it("signale les références déjà reçues sans empêcher une livraison distincte confirmée", async () => {
  const agent = await account(); const other = await account();
  const products = (await agent.get("/api/workspace/catalog").expect(200)).body.products;
  const product = products[0];
  const differentSupplierProduct = products.find((candidate: { supplierId: string }) => candidate.supplierId !== product.supplierId);
  expect(differentSupplierProduct).toBeDefined();
  const otherProduct = (await other.get("/api/workspace/catalog").expect(200)).body.products[0];
  const draft = { reference: "  Facture   123 ", date: "2026-09-11", supplierId: product.supplierId,
    lines: [{ productId: product.id, quantity: 1, unitPrice: 2, unit: product.unit }] };
  await agent.post(`/api/workspace/invoices/${randomUUID()}`).send({ revision: 0, receive: true, draft: { ...draft,
    supplierId: differentSupplierProduct.supplierId, lines: [{ ...draft.lines[0], productId: differentSupplierProduct.id,
      unit: differentSupplierProduct.unit }] } }).expect(200);
  const ids = [randomUUID(), randomUUID()];
  const receive = (id: string, body: object) => agent.post(`/api/workspace/invoices/${id}`).send(body);
  const input = { draft, revision: 0, receive: true };
  const concurrent = await Promise.all(ids.map((id) => receive(id, input)));
  expect(concurrent.map((result) => result.status).sort()).toEqual([200, 409]);
  const duplicate = concurrent.find((result) => result.status === 409)!;
  expect(duplicate.body.error.code).toBe("POSSIBLE_DUPLICATE_INVOICE");
  const firstConfirmation = duplicate.body.error.duplicates.map(({ id, version }: { id: string; version: string }) => ({ id, version }));
  const blockedId = ids[concurrent.findIndex((result) => result.status === 409)];
  const thirdId = randomUUID();
  await receive(thirdId, { ...input, confirmedDuplicates: firstConfirmation }).expect(200);
  const stale = await receive(blockedId, { ...input, confirmedDuplicates: firstConfirmation }).expect(409);
  expect(stale.body.error.duplicates).toHaveLength(2);
  const confirmedDuplicates = stale.body.error.duplicates.map(({ id, version }: { id: string; version: string }) => ({ id, version }));
  const accepted = await receive(blockedId, { ...input, confirmedDuplicates }).expect(200);
  await receive(blockedId, { ...input, confirmedDuplicates }).expect(200);
  expect(accepted.body.status).toBe("received");
  await other.post(`/api/workspace/invoices/${randomUUID()}`).send({ ...input, draft: { ...draft, supplierId: otherProduct.supplierId,
    lines: [{ ...draft.lines[0], productId: otherProduct.id, unit: otherProduct.unit }] } }).expect(200);
});
