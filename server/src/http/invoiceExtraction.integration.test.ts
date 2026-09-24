import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app, createApp } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { localDemoInvoiceExtractionAdapter } from "../integrations/localDemoInvoiceExtractionAdapter.js";

const fixtureApp = createApp(localDemoInvoiceExtractionAdapter);
const fixtureBytes = await readFile(new URL("../../../public/fixtures/invoice-extraction-demo.pdf", import.meta.url));
const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

async function account(label: string, application = fixtureApp) {
  const agent = request.agent(application);
  const response = await agent.post("/api/auth/register").send({ displayName: `${label} extraction test`,
    email: `${label}-${randomUUID()}@example.com`, password: "invoice extraction test password" }).expect(201);
  users.push(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id }, include: { restaurant: true } });
  return { agent, userId: user.id, restaurantId: user.restaurant!.id };
}

const uploadBytes = (agent: ReturnType<typeof request.agent>, bytes: Buffer, contentType = "application/pdf") =>
  agent.post("/api/workspace/invoice-extractions").set("Content-Type", contentType).send(bytes);
const uploadFixture = (agent: ReturnType<typeof request.agent>) => uploadBytes(agent, fixtureBytes);

it("uploads only the local synthetic PDF, persists an isolated replayable candidate, then requires C1 review to receive", async () => {
  const owner = await account("extraction-owner");
  const other = await account("extraction-other");
  await owner.agent.get("/api/workspace/invoice-extraction/status").expect(200)
    .expect(({ body }) => expect(body).toEqual({ mode: "demo_fixture" }));
  await request(fixtureApp).post("/api/workspace/invoice-extractions").set("Content-Type", "application/pdf")
    .send(fixtureBytes).expect(401);

  await owner.agent.post("/api/workspace/invoice-extractions").set("Content-Type", "text/plain")
    .send(fixtureBytes).expect(415).expect(({ body }) => expect(body.error.code).toBe("UNSUPPORTED_INVOICE_TYPE"));
  await owner.agent.post("/api/workspace/invoice-extractions").set("Content-Type", "application/pdf")
    .send(Buffer.from("not a PDF")).expect(400).expect(({ body }) => expect(body.error.code).toBe("INVALID_INVOICE_FILE"));
  await uploadBytes(owner.agent, Buffer.concat([fixtureBytes, Buffer.from("\n")])).expect(503)
    .expect(({ body }) => expect(body.error.code).toBe("EXTRACTION_UNAVAILABLE"));

  const [created, replayed] = await Promise.all([uploadFixture(owner.agent), uploadFixture(owner.agent)]);
  expect([created.status, replayed.status].sort()).toEqual([200, 201]);
  expect(replayed.body.id).toBe(created.body.id);
  const sourceId = created.body.id as string;
  const detail = await owner.agent.get(`/api/workspace/source-invoices/${sourceId}`).expect(200);
  expect(detail.body).toMatchObject({ id: sourceId, title: "Facture DEMO-2026-09-01", date: "2026-09-20",
    supplier: "Maison Potager Demo", type: "invoice", status: "Extraction candidate à vérifier",
    stockLines: [{ name: "Tomates rondes (origine fictive)", quantity: 2, unit: "kg", unitPrice: 3.5 }] });
  expect(JSON.stringify(detail.body)).not.toContain(fixtureBytes.toString("latin1"));
  await other.agent.get(`/api/workspace/source-invoices/${sourceId}`).expect(404);
  await other.agent.post(`/api/workspace/invoices/from-source/${sourceId}`).send({}).expect(404);

  const storedSource = await prisma.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: {
    restaurantId: owner.restaurantId, kind: `source-invoice:${sourceId}`,
  } } });
  expect(JSON.stringify(storedSource.data)).not.toContain(fixtureBytes.toString("latin1"));
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId, sourceDocumentId: sourceId } })).toBe(0);

  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products.find((item: { unit: string }) => item.unit === "kg");
  const beforeStock = product.currentStock as number;
  const pending = await owner.agent.post(`/api/workspace/invoices/from-source/${sourceId}`).send({}).expect(200);
  expect(pending.body).toMatchObject({ id: `source:${sourceId}`, status: "draft", provenance: "demo_simulation",
    sourceTypeConfirmed: false, sourceDateConfirmed: false,
    lines: [{ disposition: "pending", sourceName: "Tomates rondes (origine fictive)" }] });

  const correctedDraft = { reference: pending.body.reference, date: pending.body.date, sourceTypeConfirmed: false,
    sourceDateConfirmed: false, lines: [{ ...pending.body.lines[0], productId: product.id, quantity: 5.5,
      unitPrice: 3.25, unit: product.unit, disposition: "stock" }] };
  const corrected = await owner.agent.post(`/api/workspace/invoices/${pending.body.id}`).send({ draft: correctedDraft,
    revision: pending.body.revision, receive: false }).expect(200);
  expect(corrected.body).toMatchObject({ status: "draft", revision: 2, lines: [{ quantity: 5.5 }] });
  await owner.agent.post(`/api/workspace/invoices/${pending.body.id}`).send({ draft: correctedDraft,
    revision: corrected.body.revision, receive: true }).expect(409).expect(({ body }) =>
    expect(body.error.code).toBe("SOURCE_TYPE_REVIEW_REQUIRED"));
  expect((await owner.agent.get("/api/workspace/catalog").expect(200)).body.products
    .find((item: { id: string }) => item.id === product.id).currentStock).toBe(beforeStock);

  const received = await owner.agent.post(`/api/workspace/invoices/${pending.body.id}`).send({ draft: {
    ...correctedDraft, sourceTypeConfirmed: true, sourceDateConfirmed: true,
  }, revision: corrected.body.revision, receive: true }).expect(200);
  expect(received.body).toMatchObject({ status: "received", revision: 3 });
  expect((await owner.agent.get("/api/workspace/catalog").expect(200)).body.products
    .find((item: { id: string }) => item.id === product.id).currentStock).toBe(beforeStock + 5.5);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId, sourceDocumentId: sourceId } })).toBe(1);
});

it("keeps the extraction fallback manual when no provider is configured", async () => {
  const owner = await account("extraction-manual", app);
  await owner.agent.get("/api/workspace/invoice-extraction/status").expect(200)
    .expect(({ body }) => expect(body).toEqual({ mode: "manual" }));
  await uploadBytes(owner.agent, Buffer.from("no document is processed while the adapter is disabled"), "text/plain").expect(503).expect(({ body }) =>
    expect(body.error).toMatchObject({ code: "EXTRACTION_UNAVAILABLE" }));
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: owner.restaurantId, kind: { startsWith: "source-invoice:" } } })).toBe(0);
});
