import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { mapInvoiceExtractionToSourceDocument } from "../application/workspace/invoiceExtractionService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { describeInvoiceFile, type InvoiceExtractionAdapter } from "../integrations/invoiceExtractionAdapter.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

async function account(label: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: `${label} extraction test`,
    email: `${label}-${randomUUID()}@example.com`, password: "invoice extraction test password" }).expect(201);
  users.push(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id }, include: { restaurant: true } });
  return { agent, userId: user.id, restaurantId: user.restaurant!.id };
}

it("routes a synthetic extraction through C1 as a replayable candidate, not a receipt", async () => {
  const owner = await account("extraction-owner");
  const other = await account("extraction-other");
  const bytes = Buffer.from("synthetic invoice bytes; no real document or supplier data");
  const file = describeInvoiceFile(bytes, "application/pdf");
  const fixtureAdapter: InvoiceExtractionAdapter = {
    provider: "test_fixture_only",
    async extract(input) {
      return { status: "ok", payload: { sourceFileHash: input.file.sha256, title: "Facture de test",
        date: "2026-09-20", supplier: "Fournisseur fictif", type: "invoice",
        extractedText: "Facture de test — transcription candidate", stockLines: [{ name: "Farine fixture",
          quantity: 4, unit: "kg", unitPrice: 2.5, sourceQuantityText: "4 kg", sourceLineNumber: 1,
          priceBasis: "stated_unit_price", priceTaxBasis: "HT" }] } };
    },
  };
  const result = await fixtureAdapter.extract({ file, bytes });
  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error("Fixture adapter unexpectedly unavailable.");
  const source = mapInvoiceExtractionToSourceDocument(owner.restaurantId, file, result.payload);
  const replayedResult = await fixtureAdapter.extract({ file, bytes });
  expect(replayedResult.status).toBe("ok");
  if (replayedResult.status !== "ok") throw new Error("Fixture replay unexpectedly unavailable.");
  const replayedSource = mapInvoiceExtractionToSourceDocument(owner.restaurantId, file, replayedResult.payload);
  expect(replayedSource.id).toBe(source.id);
  expect(mapInvoiceExtractionToSourceDocument(other.restaurantId, file, result.payload).id).not.toBe(source.id);

  await prisma.workspaceDocument.create({ data: { restaurantId: owner.restaurantId,
    kind: `source-invoice:${source.id}`, data: source } });
  const [created, replayed] = await Promise.all([1, 2].map(() =>
    owner.agent.post(`/api/workspace/invoices/from-source/${source.id}`).send({})));
  expect(created.status).toBe(200);
  expect(replayed.status).toBe(200);
  expect(created.body).toMatchObject({ id: `source:${source.id}`, status: "draft", provenance: "demo_simulation",
    sourceContentHash: file.sha256, sourceTypeConfirmed: false, sourceDateConfirmed: false,
    lines: [{ disposition: "pending", sourceName: "Farine fixture" }] });
  expect(replayed.body.id).toBe(created.body.id);
  expect(replayed.body.revision).toBe(created.body.revision);

  const storedSource = await prisma.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: {
    restaurantId: owner.restaurantId, kind: `source-invoice:${source.id}`,
  } } });
  expect(JSON.stringify(storedSource.data)).not.toContain(bytes.toString());
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId, sourceDocumentId: source.id } })).toBe(0);
  await other.agent.get(`/api/workspace/source-invoices/${source.id}`).expect(404);
  await other.agent.post(`/api/workspace/invoices/from-source/${source.id}`).send({}).expect(404);

  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products.find((item: { unit: string }) => item.unit === "kg");
  const beforeStock = product.currentStock as number;
  const pending = created.body;
  const correctedDraft = { reference: pending.reference, date: pending.date, sourceTypeConfirmed: false,
    sourceDateConfirmed: false, lines: [{ ...pending.lines[0], productId: product.id, quantity: 5.5,
      unitPrice: 3.25, unit: product.unit, disposition: "stock" }] };
  const corrected = await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send({ draft: correctedDraft,
    revision: pending.revision, receive: false }).expect(200);
  expect(corrected.body).toMatchObject({ status: "draft", revision: 2, lines: [{ quantity: 5.5 }] });
  await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send({ draft: correctedDraft,
    revision: corrected.body.revision, receive: true }).expect(409).expect(({ body }) =>
    expect(body.error.code).toBe("SOURCE_TYPE_REVIEW_REQUIRED"));
  expect((await owner.agent.get("/api/workspace/catalog").expect(200)).body.products
    .find((item: { id: string }) => item.id === product.id).currentStock).toBe(beforeStock);

  const received = await owner.agent.post(`/api/workspace/invoices/${pending.id}`).send({ draft: {
    ...correctedDraft, sourceTypeConfirmed: true, sourceDateConfirmed: true,
  }, revision: corrected.body.revision, receive: true }).expect(200);
  expect(received.body).toMatchObject({ status: "received", revision: 3 });
  expect((await owner.agent.get("/api/workspace/catalog").expect(200)).body.products
    .find((item: { id: string }) => item.id === product.id).currentStock).toBe(beforeStock + 5.5);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId, sourceDocumentId: source.id } })).toBe(1);
});
