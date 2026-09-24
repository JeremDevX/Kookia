import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

async function account(label: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: `${label} source test`, email: `${label}-${randomUUID()}@example.com`, password: "source invoice test password",
  }).expect(201);
  users.push(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id }, include: { restaurant: true } });
  return { agent, restaurantId: user.restaurant!.id, userId: user.id };
}

function sourceDocument(type: "invoice" | "credit" | "delivery" = "invoice", lines = [sourceLine(8)]) {
  const id = randomBytes(12).toString("hex");
  const content = `Fixture source ${id}; entièrement fictive.`;
  return {
    id, contentHash: createHash("sha256").update(content).digest("hex"), title: `Pièce fictive ${id}`,
    date: "2026-09-20", originalDate: "2021-12-30", supplier: "Fournisseur fictif", type,
    status: "Transcription synthétique à confirmer", content, stockLines: type === "invoice" ? lines : [],
  };
}

function sourceLine(sourceLineNumber: number) {
  return { name: "Produit de fixture", quantity: 4, unit: "kg", unitPrice: 2.5, sourceQuantityText: "4 kg",
    sourceLineNumber, priceBasis: "stated_unit_price", priceTaxBasis: "HT" };
}

async function storeSource(restaurantId: string, source: ReturnType<typeof sourceDocument>) {
  await prisma.workspaceDocument.create({ data: { restaurantId, kind: `source-invoice:${source.id}`, data: source } });
}

it("links a source draft once, preserves corrections, and receives exactly one simulated movement", async () => {
  const owner = await account("source-owner");
  const other = await account("source-other");
  const source = sourceDocument();
  await storeSource(owner.restaurantId, source);

  const draftResponses = await Promise.all([1, 2].map(() => owner.agent.post(`/api/workspace/invoices/from-source/${source.id}`).send({})));
  expect(draftResponses.map((response) => response.status)).toEqual([200, 200]);
  expect(draftResponses[0].body.id).toBe(`source:${source.id}`);
  expect(draftResponses[1].body.id).toBe(draftResponses[0].body.id);
  expect(draftResponses[0].body.revision).toBe(1);
  expect(draftResponses[0].body.sourceContentHash).toBe(source.contentHash);
  expect(draftResponses[0].body.sourceDocumentRevision).toBe(0);
  expect(draftResponses[0].body.provenance).toBe("demo_simulation");
  await other.agent.post(`/api/workspace/invoices/from-source/${source.id}`).send({}).expect(404);

  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products.find((item: { unit: string }) => item.unit === "kg");
  const pending = draftResponses[0].body;
  const draft = { reference: pending.reference, date: pending.date, sourceTypeConfirmed: true, sourceDateConfirmed: true, lines: [{
    ...pending.lines[0], productId: product.id, quantity: 5.5, unitPrice: 3.25, unit: product.unit, disposition: "stock",
  }] };
  const saved = await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send({ draft, revision: pending.revision, receive: false }).expect(200);
  expect(saved.body.revision).toBe(2);
  await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send({ draft, revision: pending.revision, receive: false }).expect(409);

  const revisionHistory = await prisma.invoiceDraftRevision.findMany({
    where: { restaurantId: owner.restaurantId, invoiceDocumentId: pending.id }, orderBy: { revision: "asc" },
  });
  expect(revisionHistory.map((item) => item.revision)).toEqual([1, 2]);
  expect(revisionHistory.every((item) => item.actorId === owner.userId && item.sourceContentHash === source.contentHash)).toBe(true);
  expect((revisionHistory[0].data as { lines: Array<{ disposition: string }> }).lines[0].disposition).toBe("pending");
  expect((revisionHistory[1].data as { lines: Array<{ quantity: number }> }).lines[0].quantity).toBe(5.5);

  const receivePayload = { draft, revision: saved.body.revision, receive: true };
  const receipts = await Promise.all([owner.agent.post(`/api/workspace/invoices/${pending.id}`).send(receivePayload),
    owner.agent.post(`/api/workspace/invoices/${pending.id}`).send(receivePayload)]);
  expect(receipts.map((response) => response.status)).toEqual([200, 200]);
  expect(receipts[0].body.status).toBe("received");
  const after = await owner.agent.get("/api/workspace/catalog").expect(200);
  expect(after.body.products.find((item: { id: string }) => item.id === product.id).currentStock).toBe(product.currentStock + 5.5);
  const movements = await prisma.stockMovement.findMany({ where: { restaurantId: owner.restaurantId, sourceDocumentId: source.id } });
  expect(movements).toHaveLength(1);
  expect(movements[0]).toMatchObject({
    sourceContentHash: source.contentHash, sourceDocumentRevision: 0, invoiceDocumentId: pending.id,
    invoiceRevision: 3, actorId: owner.userId, reason: "invoice_import_demo",
  });
  expect(movements[0].operationId).toContain(`restaurant-simulation-v1:invoice:${source.id}:`);
  const movementHistory = await owner.agent.get(`/api/workspace/products/${product.id}/movements`).expect(200);
  expect(movementHistory.body.find((item: { sourceDocumentId?: string }) => item.sourceDocumentId === source.id)).toMatchObject({
    sourceContentHash: source.contentHash, sourceDocumentRevision: 0, invoiceDocumentId: pending.id, invoiceRevision: 3,
  });
  expect((await prisma.invoiceDraftRevision.findMany({ where: { restaurantId: owner.restaurantId, invoiceDocumentId: pending.id } }))
    .map((item) => item.revision).sort()).toEqual([1, 2, 3]);
  const repeated = await owner.agent.post(`/api/workspace/invoices/from-source/${source.id}`).send({}).expect(200);
  expect(repeated.body).toMatchObject({ id: pending.id, status: "received", revision: 3 });
  await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send({ ...receivePayload, draft: { ...draft, reference: "Autre valeur" } }).expect(409);
  const listedSource = await owner.agent.get("/api/workspace/source-invoices").expect(200);
  expect(listedSource.body[0]).toMatchObject({ invoiceId: pending.id, invoiceStatus: "received", sourceMovementCount: 1 });

  const storedSource = await prisma.workspaceDocument.findUniqueOrThrow({
    where: { restaurantId_kind: { restaurantId: owner.restaurantId, kind: `source-invoice:${source.id}` } },
  });
  await prisma.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId: owner.restaurantId, kind: storedSource.kind } },
    data: { data: { ...(storedSource.data as Prisma.InputJsonObject), contentHash: "b".repeat(64) }, revision: { increment: 1 } } });
  await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send(receivePayload).expect(409);
});

it("blocks simulated duplicates, partial/unreviewed sources and non-invoice types without partial stock changes", async () => {
  const owner = await account("source-guard");
  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products.find((item: { unit: string }) => item.unit === "kg");
  const simulatedSource = sourceDocument();
  await storeSource(owner.restaurantId, simulatedSource);
  const simulatedOperationId = `restaurant-simulation-v1:invoice:${simulatedSource.id}:${product.id}`;
  await prisma.$transaction([
    prisma.product.update({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: product.id } }, data: { currentStock: { increment: 3 } } }),
    prisma.stockMovement.create({ data: { restaurantId: owner.restaurantId, productId: product.id, delta: 3,
      reason: "invoice_import_demo", operationId: simulatedOperationId, actorId: "restaurant-simulation:v1" } }),
  ]);
  const sourceDraft = (await owner.agent.post(`/api/workspace/invoices/from-source/${simulatedSource.id}`).send({}).expect(200)).body;
  const sourcePayload = { reference: sourceDraft.reference, date: sourceDraft.date, sourceTypeConfirmed: true, sourceDateConfirmed: true,
    lines: [{ ...sourceDraft.lines[0], productId: product.id, quantity: 4, unitPrice: 2.5, unit: product.unit, disposition: "stock" }] };
  await owner.agent.post(`/api/workspace/invoices/${sourceDraft.id}`).send({ draft: sourcePayload, revision: sourceDraft.revision, receive: true }).expect(409)
    .expect(({ body }) => expect(body.error.code).toBe("SOURCE_ALREADY_CREDITED"));
  const afterSimulation = await owner.agent.get("/api/workspace/catalog").expect(200);
  expect(afterSimulation.body.products.find((item: { id: string }) => item.id === product.id).currentStock).toBe(product.currentStock + 3);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId, operationId: simulatedOperationId } })).toBe(1);
  expect((await owner.agent.get("/api/workspace/source-invoices").expect(200)).body.find((item: { id: string }) => item.id === simulatedSource.id)
    .alreadyCreditedBySimulation).toBe(true);
  expect((await owner.agent.get("/api/workspace/invoices").expect(200)).body.find((item: { id: string }) => item.id === sourceDraft.id)
    .alreadyCreditedBySimulation).toBe(true);

  const partialSource = sourceDocument("invoice", [sourceLine(8), sourceLine(12)]);
  await storeSource(owner.restaurantId, partialSource);
  const partialDraft = (await owner.agent.post(`/api/workspace/invoices/from-source/${partialSource.id}`).send({}).expect(200)).body;
  await owner.agent.post(`/api/workspace/invoices/${partialDraft.id}`).send({ draft: {
    reference: partialDraft.reference, date: partialDraft.date, sourceTypeConfirmed: true, sourceDateConfirmed: true,
    lines: [{ ...partialDraft.lines[0], productId: product.id, quantity: 1, unitPrice: 2, unit: product.unit, disposition: "stock" }],
  }, revision: partialDraft.revision, receive: true }).expect(409).expect(({ body }) => expect(body.error.code).toBe("PARTIAL_RECEIPT_UNSUPPORTED"));

  for (const type of ["credit", "delivery"] as const) {
    const nonInvoice = sourceDocument(type);
    await storeSource(owner.restaurantId, nonInvoice);
    const draft = (await owner.agent.post(`/api/workspace/invoices/from-source/${nonInvoice.id}`).send({}).expect(200)).body;
    await owner.agent.post(`/api/workspace/invoices/${draft.id}`).send({ draft: {
      reference: draft.reference, date: draft.date, sourceTypeConfirmed: true, sourceDateConfirmed: true, lines: [],
    }, revision: draft.revision, receive: true }).expect(409).expect(({ body }) => expect(body.error.code).toBe("SOURCE_TYPE_NOT_RECEIVABLE"));
  }

  const noLines = sourceDocument("invoice", []);
  await storeSource(owner.restaurantId, noLines);
  const emptyDraft = (await owner.agent.post(`/api/workspace/invoices/from-source/${noLines.id}`).send({}).expect(200)).body;
  await owner.agent.post(`/api/workspace/invoices/${emptyDraft.id}`).send({ draft: {
    reference: emptyDraft.reference, date: emptyDraft.date, sourceTypeConfirmed: true, sourceDateConfirmed: true, lines: [],
  }, revision: emptyDraft.revision, receive: true }).expect(409).expect(({ body }) => expect(body.error.code).toBe("SOURCE_NO_LINES"));

  const rollbackSource = sourceDocument("invoice", [sourceLine(8), sourceLine(12)]);
  await storeSource(owner.restaurantId, rollbackSource);
  const rollbackDraft = (await owner.agent.post(`/api/workspace/invoices/from-source/${rollbackSource.id}`).send({}).expect(200)).body;
  const beforeRollback = await owner.agent.get("/api/workspace/catalog").expect(200);
  await owner.agent.post(`/api/workspace/invoices/${rollbackDraft.id}`).send({ draft: {
    reference: rollbackDraft.reference, date: rollbackDraft.date, sourceTypeConfirmed: true, sourceDateConfirmed: true,
    lines: rollbackDraft.lines.map((line: Record<string, unknown>, index: number) => ({ ...line,
      productId: index === 0 ? product.id : "missing-product", quantity: 2, unitPrice: 1, unit: "kg", disposition: "stock" })),
  }, revision: rollbackDraft.revision, receive: true }).expect(400);
  const afterRollback = await owner.agent.get("/api/workspace/catalog").expect(200);
  expect(afterRollback.body).toEqual(beforeRollback.body);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId, sourceDocumentId: rollbackSource.id } })).toBe(0);
});
