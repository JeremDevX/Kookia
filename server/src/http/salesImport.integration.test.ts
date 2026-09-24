import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({
    displayName: "CSV test", email: `sales-csv-${randomUUID()}@example.com`, password: "sales csv test password",
  }).expect(201);
  ids.push(result.body.user.id);
  return agent;
}

it("previews row errors and mappings, imports valid rows once, and keeps manual sales available", async () => {
  const owner = await account();
  const other = await account();
  const pizza = await owner.post("/api/workspace/sales/items").send({ name: "Pizza" }).expect(201);
  const salad = await owner.post("/api/workspace/sales/items").send({ name: "Salade" }).expect(201);
  const foreign = await other.post("/api/workspace/sales/items").send({ name: "Other" }).expect(201);
  const catalogBefore = await owner.get("/api/workspace/catalog").expect(200);
  await owner.put("/api/workspace/sales/service-days/2026-09-23")
    .send({ expectedRevision: 0, status: "closed", coverage: "complete" }).expect(200);
  await owner.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: pizza.body.id,
    serviceDate: "2026-09-18", quantity: 2 }).expect(201);
  const csv = "service_date,item_name,quantity\n2026-09-19,Pizza,3\n2026-09-19,Pizza,4\n2026-09-18,Pizza,5\n2026-09-20,Salaat,6\n2026-09-21,Salade,0\n2026-09-22,Salade,7\n2026-09-23,Pizza,2\n";
  const url = "/api/workspace/sales/imports";
  await request(app).post(`${url}/preview`).send({ csv, mapping: {} }).expect(401);
  const first = await owner.post(`${url}/preview`).send({ csv, mapping: {} }).expect(200);
  expect(first.body.rows.map((row: { status: string }) => row.status)).toEqual(["ready", "duplicate", "existing", "unmapped", "invalid", "ready", "closed"]);
  const foreignMapping = await owner.post(`${url}/preview`).send({ csv, mapping: { Salaat: foreign.body.id } }).expect(200);
  expect(foreignMapping.body.rows[3].status).toBe("unmapped");
  expect(foreignMapping.body.hash).not.toBe(first.body.hash);
  const mapped = await owner.post(`${url}/preview`).send({ csv, mapping: { Salaat: salad.body.id } }).expect(200);
  expect(mapped.body.readyCount).toBe(3);
  expect(mapped.body.rejectedCount).toBe(3);
  expect(mapped.body.conflictCount).toBe(1);
  await owner.post(url).send({ csv, mapping: { Salaat: salad.body.id }, expectedHash: "0".repeat(64) }).expect(409);
  const saved = await owner.post(url).send({ csv, mapping: { Salaat: salad.body.id }, expectedHash: mapped.body.hash }).expect(201);
  expect(saved.body).toMatchObject({ alreadyImported: false, acceptedCount: 3, rejectedCount: 3, conflictCount: 1 });
  const contributions = await prisma.saleContribution.findMany({ where: { importId: saved.body.id }, orderBy: { importLine: "asc" } });
  expect(contributions).toHaveLength(7);
  expect(contributions.map((row) => row.status)).toEqual(["accepted", "rejected", "pending", "accepted", "rejected", "accepted", "rejected"]);
  expect(contributions[0]).toMatchObject({ source: "csv", sourceItemName: "Pizza", sourceDate: "2026-09-19", sourceQuantity: "3", quantity: 3, importLine: 2 });
  expect(contributions[4]).toMatchObject({ sourceDate: "2026-09-21", sourceQuantity: "0", quantity: null, status: "rejected" });
  expect((await prisma.saleContributionEvent.findFirstOrThrow({ where: { contributionId: contributions[4].id } })).reason)
    .toContain("Quantité entière positive attendue");
  expect(await prisma.saleImport.findUniqueOrThrow({ where: { id: saved.body.id } })).toMatchObject({ mappingSnapshot: { Salaat: salad.body.id } });
  const daysAfterImport = (await owner.get("/api/workspace/sales/service-days?from=2026-09-19&to=2026-09-23").expect(200)).body;
  expect(daysAfterImport).toEqual(expect.arrayContaining([
    expect.objectContaining({ serviceDate: "2026-09-19", status: "open", coverage: "partial", salesCount: 1 }),
    expect.objectContaining({ serviceDate: "2026-09-22", status: "open", coverage: "partial", salesCount: 1 }),
    expect.objectContaining({ serviceDate: "2026-09-23", status: "closed", coverage: "complete", salesCount: 0 }),
  ]));
  const repeated = await owner.post(url).send({ csv, mapping: { Salaat: salad.body.id }, expectedHash: mapped.body.hash }).expect(201);
  expect(repeated.body).toMatchObject({ id: saved.body.id, alreadyImported: true, acceptedCount: 3 });
  const list = await owner.get("/api/workspace/sales?from=2026-09-18&to=2026-09-22").expect(200);
  expect(list.body).toHaveLength(4);
  expect(list.body.filter((sale: { source: string }) => sale.source === "csv")).toHaveLength(3);
  expect((await prisma.dailySale.count({ where: { importId: saved.body.id } }))).toBe(3);
  expect((await owner.get("/api/workspace/catalog").expect(200)).body).toEqual(catalogBefore.body);
  expect((await other.get("/api/workspace/sales?from=2026-09-18&to=2026-09-22").expect(200)).body).toEqual([]);
  await owner.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: pizza.body.id,
    serviceDate: "2026-09-22", quantity: 1 }).expect(201);
});

it("isolates identical files by restaurant, preserves import provenance after correction and avoids concurrent duplicates", async () => {
  const owner = await account();
  const other = await account();
  const item = await owner.post("/api/workspace/sales/items").send({ name: "Burger" }).expect(201);
  await other.post("/api/workspace/sales/items").send({ name: "Burger" }).expect(201);
  const csv = "service_date,item_name,quantity\n2026-09-17,Burger,8\n";
  const url = "/api/workspace/sales/imports";
  const [a, b] = await Promise.all([
    owner.post(`${url}/preview`).send({ csv, mapping: {} }).expect(200),
    other.post(`${url}/preview`).send({ csv, mapping: {} }).expect(200),
  ]);
  expect(a.body.hash).toBe(b.body.hash);
  const [first, second] = await Promise.all([
    owner.post(url).send({ csv, mapping: {}, expectedHash: a.body.hash }).expect(201),
    other.post(url).send({ csv, mapping: {}, expectedHash: b.body.hash }).expect(201),
  ]);
  expect(first.body.alreadyImported).toBe(false);
  expect(second.body.alreadyImported).toBe(false);
  expect(first.body.id).not.toBe(second.body.id);
  const imported = (await owner.get("/api/workspace/sales?from=2026-09-17&to=2026-09-17").expect(200)).body[0];
  const correctionOperationId = randomUUID();
  const corrected = await owner.patch(`/api/workspace/sales/${imported.id}`).send({ saleItemId: item.body.id,
    serviceDate: "2026-09-17", quantity: 9, revision: 0, operationId: correctionOperationId,
    reason: "Correction après comparaison au ticket." }).expect(200);
  expect(corrected.body).toMatchObject({ source: "csv", revision: 1, quantity: 9 });
  expect((await prisma.dailySale.findUniqueOrThrow({ where: { id: imported.id } })).importId).toBe(first.body.id);
  const correctedContribution = await prisma.dailySale.findUniqueOrThrow({ where: { id: imported.id }, include: { contribution: true } });
  expect(correctedContribution.contribution).toMatchObject({ source: "manual", sourceItemName: "Burger", sourceQuantity: "9", status: "accepted", sourceRevision: 1 });
  expect(await prisma.saleContributionEvent.count({ where: { contribution: { importId: first.body.id }, kind: "corrected" } })).toBe(1);
  expect((await other.get("/api/workspace/sales?from=2026-09-17&to=2026-09-17").expect(200)).body[0].quantity).toBe(8);

  const concurrentDate = "2026-09-16";
  const one = `service_date,item_name,quantity\n${concurrentDate},Burger,1\n`;
  const two = `service_date,item_name,quantity\n${concurrentDate},Burger,2\n`;
  const [p1, p2] = await Promise.all([
    owner.post(`${url}/preview`).send({ csv: one, mapping: {} }).expect(200),
    owner.post(`${url}/preview`).send({ csv: two, mapping: {} }).expect(200),
  ]);
  const outcomes = await Promise.all([
    owner.post(url).send({ csv: one, mapping: {}, expectedHash: p1.body.hash }),
    owner.post(url).send({ csv: two, mapping: {}, expectedHash: p2.body.hash }),
  ]);
  expect(outcomes.filter((result) => result.status === 201)).toHaveLength(2);
  expect(outcomes.map((result) => result.body.conflictCount)).toContain(1);
  expect(outcomes.map((result) => result.body.acceptedCount)).toContain(1);
  expect((await owner.get(`/api/workspace/sales?from=${concurrentDate}&to=${concurrentDate}`).expect(200)).body).toHaveLength(1);
});

it("persists manual/CSV conflicts and requires an explicit replacement, keep, refund or void decision", async () => {
  const owner = await account();
  const other = await account();
  const item = await owner.post("/api/workspace/sales/items").send({ name: "Tarte du jour" }).expect(201);
  const date = "2026-09-15";
  const original = await owner.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: item.body.id,
    serviceDate: date, quantity: 5 }).expect(201);
  const csv = `service_date,item_name,quantity\n${date},Tarte du jour,2\n`;
  const preview = await owner.post("/api/workspace/sales/imports/preview").send({ csv, mapping: {} }).expect(200);
  expect(preview.body.rows[0].status).toBe("existing");
  const saved = await owner.post("/api/workspace/sales/imports").send({ csv, mapping: {}, expectedHash: preview.body.hash }).expect(201);
  expect(saved.body).toMatchObject({ acceptedCount: 0, rejectedCount: 0, conflictCount: 1 });
  expect((await owner.get(`/api/workspace/sales?from=${date}&to=${date}`).expect(200)).body).toHaveLength(1);
  expect((await owner.get(`/api/workspace/sales/contributions?from=${date}&to=${date}`).expect(200)).body)
    .toEqual(expect.arrayContaining([expect.objectContaining({ status: "pending", source: "csv", quantity: 2,
      sourceItemName: "Tarte du jour", currentSale: expect.objectContaining({ id: original.body.id, quantity: 5 }) })]));
  const candidate = await prisma.saleContribution.findFirstOrThrow({ where: { importId: saved.body.id } });
  await other.post(`/api/workspace/sales/contributions/${candidate.id}/review`).send({ expectedRevision: 0,
    decision: "replace", reason: "Autre tenant", operationId: randomUUID() }).expect(404);
  const operationId = randomUUID();
  await owner.post(`/api/workspace/sales/contributions/${candidate.id}/review`).send({ expectedRevision: 0,
    decision: "replace", reason: "Le rapport de caisse corrigé remplace la saisie provisoire.", operationId }).expect(200);
  await owner.post(`/api/workspace/sales/contributions/${candidate.id}/review`).send({ expectedRevision: 0,
    decision: "replace", reason: "Le rapport de caisse corrigé remplace la saisie provisoire.", operationId }).expect(200).then(({ body }) => expect(body.replayed).toBe(true));
  await owner.post(`/api/workspace/sales/contributions/${candidate.id}/review`).send({ expectedRevision: 0,
    decision: "keep", reason: "Autre décision avec la même clé.", operationId }).expect(409);
  expect((await owner.get(`/api/workspace/sales?from=${date}&to=${date}`).expect(200)).body)
    .toMatchObject([expect.objectContaining({ id: original.body.id, quantity: 2, source: "csv", revision: 1 })]);
  expect(await prisma.dailySale.count({ where: { restaurantId: candidate.restaurantId, serviceDate: new Date(`${date}T00:00:00.000Z`), saleItemId: item.body.id } })).toBe(1);

  await owner.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: item.body.id, serviceDate: date, quantity: 8 }).expect(409);
  const manualConflict = await prisma.saleContribution.findFirstOrThrow({ where: { restaurantId: candidate.restaurantId,
    source: "manual", status: "pending", sourceQuantity: "8" } });
  await owner.post(`/api/workspace/sales/contributions/${manualConflict.id}/review`).send({ expectedRevision: 0,
    decision: "keep", reason: "Le rapport importé est la source retenue.", operationId: randomUUID() }).expect(200);
  const kept = (await owner.get(`/api/workspace/sales?from=${date}&to=${date}`).expect(200)).body[0];
  expect(kept.quantity).toBe(2);
  const refundOperationId = randomUUID();
  await owner.post(`/api/workspace/sales/${kept.id}/refund`).send({ expectedRevision: kept.revision,
    reason: "Remboursement client, plat consommé.", operationId: refundOperationId }).expect(200);
  await owner.post(`/api/workspace/sales/${kept.id}/refund`).send({ expectedRevision: kept.revision,
    reason: "Remboursement client, plat consommé.", operationId: refundOperationId }).expect(200)
    .then(({ body }) => expect(body).toMatchObject({ replayed: true, quantity: 2 }));
  await owner.post(`/api/workspace/sales/${kept.id}/refund`).send({ expectedRevision: kept.revision,
    reason: "Autre contenu avec la même clé.", operationId: refundOperationId }).expect(409);
  expect((await owner.get(`/api/workspace/sales?from=${date}&to=${date}`).expect(200)).body[0].quantity).toBe(2);
  const voidOperationId = randomUUID();
  await owner.post(`/api/workspace/sales/${kept.id}/void`).send({ expectedRevision: kept.revision,
    reason: "Annulation d’une ligne saisie par erreur.", operationId: voidOperationId }).expect(200);
  await owner.post(`/api/workspace/sales/${kept.id}/void`).send({ expectedRevision: kept.revision,
    reason: "Annulation d’une ligne saisie par erreur.", operationId: voidOperationId }).expect(200)
    .then(({ body }) => expect(body).toMatchObject({ replayed: true }));
  expect((await owner.get(`/api/workspace/sales?from=${date}&to=${date}`).expect(200)).body).toEqual([]);
  expect(await prisma.saleContributionEvent.count({ where: { contributionId: kept.contributionId ?? candidate.id } })).toBeGreaterThan(0);
});
