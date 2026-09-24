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
    displayName: "Sales test", email: `sales-${randomUUID()}@example.com`, password: "sales test password",
  }).expect(201);
  ids.push(result.body.user.id);
  return agent;
}

it("records, reads and corrects only sales of owner-created items", async () => {
  const owner = await account();
  const other = await account();
  const ownerCatalog = await owner.get("/api/workspace/catalog").expect(200);
  const beforeStock = ownerCatalog.body.products[0].currentStock;
  await request(app).get("/api/workspace/sales").expect(401);
  await request(app).get("/api/workspace/sales/latest").expect(401);
  expect((await owner.get("/api/workspace/sales/latest").expect(200)).body).toBeNull();
  expect((await owner.get("/api/workspace/sales/items").expect(200)).body).toEqual([]);
  const item = await owner.post("/api/workspace/sales/items").send({ name: "Pizza du jour" }).expect(201);
  const foreignItem = await other.post("/api/workspace/sales/items").send({ name: "Autre plat" }).expect(201);
  const saleItemId = item.body.id as string;
  await owner.post("/api/workspace/sales/items").send({ name: "pizza du jour" }).expect(409);
  await owner.post("/api/workspace/sales/items").send({ name: "" }).expect(400);
  const input = { saleItemId, serviceDate: "2026-09-20", quantity: 12, operationId: randomUUID() };
  const created = await owner.post("/api/workspace/sales").send(input).expect(201);
  expect(created.body).toMatchObject({ saleItemId, saleItemName: "Pizza du jour", serviceDate: input.serviceDate, quantity: 12, source: "manual", revision: 0 });
  expect((await owner.get("/api/workspace/sales/latest").expect(200)).body)
    .toMatchObject({ serviceDate: input.serviceDate, status: "open", coverage: "partial", salesCount: 1, sources: ["manual"] });
  expect((await owner.get("/api/workspace/sales/service-days?from=2026-09-20&to=2026-09-20").expect(200)).body)
    .toMatchObject([{ serviceDate: input.serviceDate, status: "open", coverage: "partial", salesCount: 1 }]);
  expect((await other.get("/api/workspace/sales/latest").expect(200)).body).toBeNull();
  await owner.post("/api/workspace/sales").send(input).expect(201);
  await owner.post("/api/workspace/sales").send({ ...input, quantity: 13 }).expect(409);
  await owner.post("/api/workspace/sales").send({ ...input, operationId: randomUUID() }).expect(409);
  await owner.post("/api/workspace/sales").send({ ...input, saleItemId: foreignItem.body.id, operationId: randomUUID() }).expect(400);
  await owner.post("/api/workspace/sales").send({ ...input, quantity: 0, operationId: randomUUID() }).expect(400);
  await owner.post("/api/workspace/sales").send({ ...input, quantity: 0.5, operationId: randomUUID() }).expect(400);
  await owner.post("/api/workspace/sales").send({ ...input, serviceDate: "2026-09-31", operationId: randomUUID() }).expect(400);
  const list = await owner.get("/api/workspace/sales?from=2026-09-01&to=2026-09-30").expect(200);
  expect(list.body).toHaveLength(1);
  expect((await other.get("/api/workspace/sales?from=2026-09-01&to=2026-09-30").expect(200)).body).toEqual([]);
  await other.patch(`/api/workspace/sales/${created.body.id}`).send({ saleItemId: foreignItem.body.id, serviceDate: input.serviceDate,
    quantity: 3, revision: 0, operationId: randomUUID(), reason: "Tentative autre tenant." }).expect(404);
  const correctionOperationId = randomUUID();
  const corrected = await owner.patch(`/api/workspace/sales/${created.body.id}`).send({ saleItemId, serviceDate: "2026-09-19", quantity: 9, revision: 0,
    operationId: correctionOperationId, reason: "Correction de la quantité après vérification." }).expect(200);
  expect(corrected.body).toMatchObject({ serviceDate: "2026-09-19", quantity: 9, revision: 1, source: "manual" });
  await owner.patch(`/api/workspace/sales/${created.body.id}`).send({ saleItemId, serviceDate: "2026-09-19", quantity: 9, revision: 0,
    operationId: correctionOperationId, reason: "Correction de la quantité après vérification." }).expect(200)
    .then(({ body }) => expect(body.revision).toBe(1));
  expect((await owner.get("/api/workspace/sales/latest").expect(200)).body)
    .toMatchObject({ serviceDate: input.serviceDate, status: "open", coverage: "partial", salesCount: 0, sources: [] });
  await owner.patch(`/api/workspace/sales/${created.body.id}`).send({ saleItemId, serviceDate: "2026-09-19", quantity: 10, revision: 0,
    operationId: randomUUID(), reason: "Conflit de révision." }).expect(409);
  expect((await owner.get("/api/workspace/catalog").expect(200)).body.products[0].currentStock).toBe(beforeStock);
  expect((await prisma.dailySale.count({ where: { id: created.body.id } }))).toBe(1);
  expect((await other.get("/api/workspace/sales/service-days?from=2026-09-19&to=2026-09-23").expect(200)).body).toEqual([]);

  const targetDay = "2026-09-21";
  await owner.put("/api/workspace/sales/service-days/" + targetDay)
    .send({ expectedRevision: 0, status: "closed", coverage: "complete" }).expect(200)
    .then(({ body }) => expect(body).toMatchObject({ serviceDate: targetDay, status: "closed", coverage: "complete", revision: 1, salesCount: 0 }));
  await owner.put("/api/workspace/sales/service-days/" + targetDay)
    .send({ expectedRevision: 0, status: "open", coverage: "complete" }).expect(409);
  await owner.put("/api/workspace/sales/service-days/2026-09-22")
    .send({ expectedRevision: 0, status: "closed", coverage: "partial" }).expect(400);
  await owner.post("/api/workspace/sales").send({ ...input, serviceDate: targetDay, operationId: randomUUID() }).expect(409);

  const dstDate = "2026-03-29";
  await owner.put("/api/workspace/sales/service-days/" + dstDate)
    .send({ expectedRevision: 0, status: "open", coverage: "complete" }).expect(200);
  expect((await owner.get("/api/workspace/sales/service-days?from=" + dstDate + "&to=" + dstDate).expect(200)).body)
    .toMatchObject([{ serviceDate: dstDate, status: "open", coverage: "complete", salesCount: 0 }]);
  await owner.put("/api/workspace/sales/service-days/2099-01-01")
    .send({ expectedRevision: 0, status: "closed", coverage: "complete" }).expect(400);
});
