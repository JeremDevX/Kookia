import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { syncPosSales } from "../application/workspace/posSalesSyncService.js";
import type { PosAdapter } from "../integrations/posAdapter.js";
import { prisma } from "../infrastructure/database/prisma.js";

const userIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: userIds } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Ticket Z test",
    email: `ticket-z-${randomUUID()}@example.com`, password: "ticket integration password" }).expect(201);
  userIds.push(result.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: result.body.user.id } });
  return { agent, restaurantId: restaurant.id, actorId: result.body.user.id as string };
}
const pdf = (label: string) => Buffer.from(`%PDF-1.4\n${label}\n1 0 obj << /Type /Page >>\n%%EOF`);
const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const offsetDate = (date: string, offset: number) => new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10);

it("transcribes Ticket Z locally, requires sale review, preserves cross-source history and never stores the original", async () => {
  const owner = await account(), other = await account();
  const today = parisToday(), serviceDate = offsetDate(today, -1), sourceDate = offsetDate(today, -2);
  const pizza = await owner.agent.post("/api/workspace/sales/items").send({ name: "Pizza" }).expect(201);
  const soup = await owner.agent.post("/api/workspace/sales/items").send({ name: "Soupe" }).expect(201);
  const existingSale = await owner.agent.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: pizza.body.id,
    serviceDate, quantity: 5 }).expect(201);
  const bytes = pdf("ticket-owner");
  const uploadPath = "/api/workspace/sales/tickets/upload";
  await request(app).post(uploadPath).set("Content-Type", "application/pdf").send(bytes).expect(401);
  const ownerUploaded = await owner.agent.post(uploadPath).set("Content-Type", "application/pdf").send(bytes).expect(201);
  const uploaded = await owner.agent.post(uploadPath).set("Content-Type", "application/pdf").send(bytes).expect(201);
  expect(uploaded.body).toMatchObject({ status: "uploaded", mimeType: "application/pdf", byteSize: bytes.length,
    provenance: "recorded_sales", duplicate: true });
  const otherUploaded = await other.agent.post(uploadPath).set("Content-Type", "application/pdf").send(bytes).expect(201);
  expect(otherUploaded.body).toMatchObject({ duplicate: false, status: "uploaded" });
  expect(otherUploaded.body.id).not.toBe(ownerUploaded.body.id);
  const otherBatches = await other.agent.get("/api/workspace/sales/tickets").expect(200);
  expect(otherBatches.body).toHaveLength(1);
  expect(otherBatches.body[0].id).toBe(otherUploaded.body.id);
  await other.agent.delete(`/api/workspace/sales/tickets/${uploaded.body.id}`).expect(404);
  await owner.agent.post(uploadPath).set("Content-Type", "application/octet-stream").send(bytes).expect(415);
  await owner.agent.post(uploadPath).set("Content-Type", "application/pdf").send(Buffer.from("not a PDF" )).expect(400);
  await owner.agent.post(uploadPath).set("Content-Type", "application/pdf").send(Buffer.alloc(4 * 1024 * 1024 + 1)).expect(413);

  const future = await owner.agent.post(`/api/workspace/sales/tickets/${uploaded.body.id}/candidates`).send({
    sourceDateText: "", serviceDate: offsetDate(today, 1), lines: [],
  }).expect(400);
  expect(future.body.error.code).toBe("FUTURE_SERVICE_DATE");
  const candidateInput = { sourceDateText: sourceDate, serviceDate,
    lines: [{ itemLabel: "Pizza", quantity: 3 }, { itemLabel: "Soupe", quantity: 2 }] };
  const imported = await owner.agent.post(`/api/workspace/sales/tickets/${uploaded.body.id}/candidates`).send(candidateInput).expect(201);
  expect(imported.body).toMatchObject({ status: "candidates", serviceDate, sourceDateText: sourceDate, recordCount: 2,
    provenance: "recorded_sales", duplicate: false, replayed: false });
  expect(await owner.agent.post(`/api/workspace/sales/tickets/${uploaded.body.id}/candidates`).send(candidateInput).expect(201)
    .then(({ body }) => body.replayed)).toBe(true);
  await owner.agent.post(`/api/workspace/sales/tickets/${uploaded.body.id}/candidates`).send({ ...candidateInput, lines: [{ itemLabel: "Pizza", quantity: 99 }] }).expect(409);
  await other.agent.post(`/api/workspace/sales/tickets/${uploaded.body.id}/candidates`).send(candidateInput).expect(404);

  const storedBatch = await prisma.ticketZBatch.findUniqueOrThrow({ where: { id: uploaded.body.id } });
  expect(storedBatch).toMatchObject({ contentHash: uploaded.body.contentHash, byteSize: bytes.length,
    sourceDateText: sourceDate, status: "candidates", recordCount: 2 });
  expect(storedBatch).not.toHaveProperty("content");
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: owner.restaurantId, kind: { startsWith: "ticket-z:" } } })).toBe(0);
  expect(await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } })).toBe(1);
  const contributions = (await owner.agent.get(`/api/workspace/sales/contributions?from=${serviceDate}&to=${serviceDate}`).expect(200)).body;
  const pizzaCandidate = contributions.find((row: { source: string; sourceItemName: string }) => row.source === "ticket_z" && row.sourceItemName === "Pizza");
  const soupCandidate = contributions.find((row: { source: string; sourceItemName: string }) => row.source === "ticket_z" && row.sourceItemName === "Soupe");
  expect(pizzaCandidate).toMatchObject({ serviceDate, sourceDate, source: "ticket_z", quantity: 3,
    currentSale: { id: existingSale.body.id, quantity: 5 }, ticketLineNumber: 1,
    ticketBatch: { contentHash: uploaded.body.contentHash, sourceDateText: sourceDate, originalFileStored: false, serviceDate, provenance: "recorded_sales" } });
  expect(soupCandidate).toMatchObject({ saleItemId: soup.body.id, status: "pending", ticketLineNumber: 2 });
  const receiptEvent = await prisma.saleContributionEvent.findFirstOrThrow({ where: { contributionId: soupCandidate.id } });
  expect(receiptEvent.snapshot).toMatchObject({ dateMatchesSource: false, originalFileStored: false });
  expect((await owner.agent.get(`/api/workspace/sales?from=${serviceDate}&to=${serviceDate}`).expect(200)).body)
    .toMatchObject([{ id: existingSale.body.id, quantity: 5, source: "manual" }]);

  await owner.agent.post(`/api/workspace/sales/contributions/${pizzaCandidate.id}/review`).send({ expectedRevision: 0,
    decision: "keep", operationId: randomUUID(), saleItemId: pizza.body.id,
    reason: "La saisie déjà vérifiée est conservée face au Ticket Z." }).expect(200);
  await owner.agent.post(`/api/workspace/sales/contributions/${soupCandidate.id}/review`).send({ expectedRevision: 0,
    decision: "replace", operationId: randomUUID(), saleItemId: soup.body.id,
    reason: "La ligne lisible du Ticket Z est confirmée." }).expect(200);
  expect(await prisma.ticketZBatch.findUniqueOrThrow({ where: { id: uploaded.body.id } })).toMatchObject({ status: "reviewed" });
  expect((await owner.agent.get(`/api/workspace/sales?from=${serviceDate}&to=${serviceDate}`).expect(200)).body)
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ id: existingSale.body.id, quantity: 5, source: "manual" }),
      expect.objectContaining({ saleItemId: soup.body.id, quantity: 2, source: "ticket_z" }),
    ]));
  expect((await owner.agent.get(`/api/workspace/sales/metrics?from=${serviceDate}&to=${serviceDate}`).expect(200)).body)
    .toMatchObject({ totalQuantity: 7, manualQuantity: 5, ticketZQuantity: 2, posQuantity: 0, demoSimulationQuantity: 0,
      status: "insufficient_history" });

  const csv = `service_date,item_name,quantity\n${serviceDate},Soupe,8\n`;
  const csvPreview = await owner.agent.post("/api/workspace/sales/imports/preview").send({ csv, mapping: {} }).expect(200);
  expect(csvPreview.body.rows[0].status).toBe("existing");
  const csvImport = await owner.agent.post("/api/workspace/sales/imports").send({ csv, mapping: {}, expectedHash: csvPreview.body.hash }).expect(201);
  const csvCandidate = await prisma.saleContribution.findFirstOrThrow({ where: { restaurantId: owner.restaurantId,
    importId: csvImport.body.id, status: "pending" } });
  await owner.agent.post(`/api/workspace/sales/contributions/${csvCandidate.id}/review`).send({ expectedRevision: 0,
    decision: "keep", operationId: randomUUID(), reason: "La ligne Ticket Z vérifiée est conservée." }).expect(200);
  const posAdapter: PosAdapter = { provider: "fixture_pos", provenance: "recorded_sales", async read() {
    return { status: "ok", payload: { batchId: "same-service-pos", nextCursor: null, coverage: "complete", records: [
      { sourceRecordId: "pos-soup-1", revision: 1, serviceDate, externalItemId: "soup", itemLabel: "Soupe", quantity: 4, refunded: false },
    ] } };
  } };
  await syncPosSales(owner.restaurantId, owner.actorId, { from: serviceDate, to: serviceDate }, posAdapter);
  const posCandidate = await prisma.saleContribution.findFirstOrThrow({ where: { restaurantId: owner.restaurantId, source: "pos" } });
  await owner.agent.post(`/api/workspace/sales/contributions/${posCandidate.id}/review`).send({ expectedRevision: 0,
    decision: "keep", operationId: randomUUID(), saleItemId: soup.body.id,
    reason: "La ligne Ticket Z vérifiée reste la vente retenue." }).expect(200);
  expect((await owner.agent.get(`/api/workspace/sales?from=${serviceDate}&to=${serviceDate}`).expect(200)).body)
    .toEqual(expect.arrayContaining([expect.objectContaining({ saleItemId: soup.body.id, quantity: 2, source: "ticket_z" })]));

  const frenchDateUpload = await owner.agent.post(uploadPath).set("Content-Type", "application/pdf").send(pdf("french-date")).expect(201);
  await owner.agent.post(`/api/workspace/sales/tickets/${frenchDateUpload.body.id}/candidates`).send({
    sourceDateText: serviceDate.split("-").reverse().join("/"), serviceDate,
    lines: [{ itemLabel: "Pizza", quantity: 1 }],
  }).expect(201);
  const frenchDateCandidate = await prisma.saleContribution.findFirstOrThrow({ where: { ticketBatchId: frenchDateUpload.body.id } });
  const frenchDateEvent = await prisma.saleContributionEvent.findFirstOrThrow({ where: { contributionId: frenchDateCandidate.id } });
  expect(frenchDateEvent.snapshot).toMatchObject({ dateMatchesSource: true });
  await owner.agent.post(`/api/workspace/sales/contributions/${frenchDateCandidate.id}/review`).send({ expectedRevision: 0,
    decision: "reject", operationId: randomUUID(), reason: "Fixture de test de date française." }).expect(200);

  const emptyUpload = await owner.agent.post(uploadPath).set("Content-Type", "application/pdf").send(pdf("no-item-detail")).expect(201);
  const noDetails = await owner.agent.post(`/api/workspace/sales/tickets/${emptyUpload.body.id}/candidates`).send({
    sourceDateText: "illisible", serviceDate, lines: [],
  }).expect(201);
  expect(noDetails.body).toMatchObject({ status: "no_details", recordCount: 0 });
  expect(await prisma.saleContribution.count({ where: { ticketBatchId: emptyUpload.body.id } })).toBe(0);
  expect(await owner.agent.delete(`/api/workspace/sales/tickets/${emptyUpload.body.id}`).expect(204).then(({ status }) => status)).toBe(204);
  await owner.agent.get("/api/workspace/sources").expect(200).then(({ body }) =>
    expect(body.sources.find((source: { kind: string }) => source.kind === "ticket_ocr")).toMatchObject({ state: "not_connected", lastSuccessAt: null }));
});
