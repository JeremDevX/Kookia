import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

it("retains the complete workspace across logout and a new authenticated session", async () => {
  const credentials = { email: `reconnect-${randomUUID()}@example.com`, password: "reconnect integration password" };
  const first = request.agent(app);
  const registered = await first.post("/api/auth/register").send({ ...credentials, displayName: "Reconnect test" }).expect(201);
  ids.push(registered.body.user.id);
  const catalog = await first.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products[0];
  await first.post(`/api/workspace/products/${product.id}/stock`).send({ operationId: randomUUID(), delta: 2 }).expect(200);
  await first.post("/api/workspace/preferences").send({ settings: { wasteTarget: "42", alertThreshold: "75", showTrends: false, showAI: true, showROI: false } }).expect(200);
  const notifications = await first.get("/api/workspace/notifications").expect(200);
  await first.post("/api/workspace/notifications/read").send({ ids: [notifications.body[0].id] }).expect(200);
  await first.post("/api/workspace/cart").send({ action: "add", items: [{ id: "retained-item", productId: product.id, productName: product.name, quantity: 3, unit: product.unit, source: "stocks" }] }).expect(200);
  await first.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: product.id, quantity: 1 }] }).expect(201);
  await first.post(`/api/workspace/invoices/${randomUUID()}`).send({ draft: { reference: "Persistent receipt", date: "2026-09-11", lines: [{ productId: product.id, quantity: 1.5, unitPrice: 2 }] }, revision: 0, receive: true }).expect(200);
  const menu = await first.get("/api/workspace/menu").expect(200);
  await first.post("/api/workspace/menu").send({ starter: "Entrée persistée", main: menu.body.main, dessert: menu.body.dessert, revision: menu.body.revision, validate: true }).expect(200);
  const restaurant = await first.get("/api/workspace/restaurant").expect(200);
  await first.patch("/api/workspace/restaurant").send({ ...restaurant.body, city: "Lyon" }).expect(200);
  await first.post("/api/workspace/productions").send({ operationId: randomUUID(), recipeName: "Déclaration persistée", portions: 2, prepTime: 10, notes: "Audit", date: "2026-09-11", kind: "record" }).expect(201);

  const paths = ["catalog", "recipes", "predictions", "analytics", "activity", "insights", "preferences", "notifications", "cart", "orders", "decisions", "invoices", "menu", "restaurant", "productions", `products/${product.id}/movements`, "report?from=2026-09-01&to=2026-09-30"];
  const snapshots = await Promise.all(paths.map(async (path) => (await first.get(`/api/workspace/${path}`).expect(200)).body));
  await first.post("/api/auth/logout").expect(204);
  await first.get("/api/workspace/catalog").expect(401);
  const second = request.agent(app);
  await second.post("/api/auth/login").send(credentials).expect(200);
  for (const [index, path] of paths.entries()) {
    const reread = await second.get(`/api/workspace/${path}`).expect(200);
    if (path.startsWith("report?")) {
      // Generation time belongs to the export request, not persisted business data.
      expect(Date.parse(reread.body.generatedAt)).toBeGreaterThanOrEqual(Date.parse(snapshots[index].generatedAt));
      expect(reread.body).toEqual({ ...snapshots[index], generatedAt: reread.body.generatedAt });
    } else {
      expect(reread.body, path).toEqual(snapshots[index]);
    }
  }
});
