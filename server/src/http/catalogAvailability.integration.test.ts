import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
it("projects expiry-qualified production availability without changing physical stock or lots", async () => {
  const agent = request.agent(app);
  const registered = (await agent.post("/api/auth/register").send({ displayName: "Availability fixture",
    email: `availability-${randomUUID()}@example.com`, password: "isolated availability fixture" }).expect(201)).body;
  users.push(registered.user.id);
  const catalog = (await agent.get("/api/workspace/catalog").expect(200)).body;
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: registered.user.id } });
  const product = (await agent.post("/api/workspace/products").send({ operationId: randomUUID(), name: "Expiry fixture",
    category: "Légumes", currentStock: 10, unit: "kg", minThreshold: 0, pricePerUnit: 1,
    supplierId: catalog.suppliers[0].id }).expect(201)).body;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const offset = (count: number) => new Date(Date.parse(today) + count * 86400000);
  const lots = await prisma.stockLot.findMany({ where: { restaurantId: restaurant.id, productId: product.id } });
  await prisma.stockLot.update({ where: { id: lots[0].id }, data: { remainingQuantity: 6, quantityReceived: 6, expiresAt: offset(-1) } });
  const usable = await prisma.stockLot.create({ data: { restaurantId: restaurant.id, productId: product.id, source: "unaged", actorId: registered.user.id,
    quantityReceived: 4, remainingQuantity: 4, receivedAt: offset(-2), expiresAt: offset(0) } });
  const read = async () => (await agent.get("/api/workspace/catalog").expect(200)).body.products.find((row: { id: string }) => row.id === product.id);
  const initialLots = await prisma.stockLot.findMany({ where: { restaurantId: restaurant.id, productId: product.id }, orderBy: { id: "asc" } });
  expect(await read()).toMatchObject({ currentStock: 10, availableForProduction: 4, expiredStock: 6, unknownExpiryStock: 0,
    lotStockMismatch: false, availabilityDate: today });
  expect(await prisma.stockLot.findMany({ where: { restaurantId: restaurant.id, productId: product.id }, orderBy: { id: "asc" } })).toEqual(initialLots);
  await prisma.stockLot.update({ where: { id: usable.id }, data: { expiresAt: null } });
  expect(await read()).toMatchObject({ currentStock: 10, availableForProduction: 4, unknownExpiryStock: 4 });
  await prisma.stockLot.update({ where: { id: usable.id }, data: { remainingQuantity: 5, quantityReceived: 5 } });
  expect(await read()).toMatchObject({ currentStock: 10, availableForProduction: null, lotStockMismatch: true });
  // Untracked legacy stock remains undated, rather than receiving an invented expiry.
  await prisma.stockLot.deleteMany({ where: { restaurantId: restaurant.id, productId: product.id } });
  expect(await read()).toMatchObject({ currentStock: 10, availableForProduction: 10, expiredStock: 0, unknownExpiryStock: 10, lotStockMismatch: false });
});
