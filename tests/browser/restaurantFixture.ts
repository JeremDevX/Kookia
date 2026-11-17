import { randomUUID } from "node:crypto";
import { expect, test as base } from "@playwright/test";
import { validateIntegrationDatabaseUrl } from "../../scripts/integrationDatabaseGuard.mjs";

type TestRestaurant = {
  headers: { "X-Expected-User-Id": string };
  addFlour: (orderPackQuantity?: number) => Promise<{ productId: string; supplierId: string }>;
  completeSetup: () => Promise<void>;
};

export const test = base.extend<{ restaurant: TestRestaurant }>({
  restaurant: async ({ page, baseURL }, provide) => {
    validateIntegrationDatabaseUrl(process.env.DATABASE_URL);
    if (!baseURL) throw new Error("Une URL d’application est requise pour le test navigateur.");
    const { registerUser, deleteAccount } = await import("../../server/src/application/auth/authService.js");
    const { sessionCookieName } = await import("../../server/src/config/env.js");
    const request = page.request;
    const email = `restaurant-${randomUUID()}@example.test`;
    const password = "mot de passe du compte de test";
    const { user, token, expiresAt } = await registerUser("Compte test", email, password);
    const headers = { "X-Expected-User-Id": user.id };

    try {
      await page.context().addCookies([{ name: sessionCookieName, value: token, url: baseURL,
        httpOnly: true, sameSite: "Strict", expires: expiresAt.getTime() / 1000 }]);
      const setup = await request.post("/api/setup", { data: {
        expectedUserId: user.id, name: "Restaurant test", type: "Restaurant", city: "Paris",
        address: "", phone: "", email, dailyCovers: 20,
      } });
      expect(setup.status()).toBe(201);

      await provide({
        headers,
        async addFlour(orderPackQuantity) {
          const supplierId = randomUUID();
          const supplier = await request.post("/api/workspace/suppliers", { headers,
            data: { id: supplierId, name: "Fournisseur test", email, phone: "" },
          });
          expect(supplier.status()).toBe(201);
          const product = await request.post("/api/workspace/products", { headers, data: {
            operationId: randomUUID(), name: "Farine test", category: "Test", currentStock: 10,
            unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId, orderPackQuantity,
          } });
          expect(product.status()).toBe(201);
          const { id: productId } = await product.json() as { id: string };
          return { productId, supplierId };
        },
        async completeSetup() {
          const steps = [
            { expectedStep: "team", nextStep: "suppliers", expectedRevision: 1 },
            { expectedStep: "suppliers", nextStep: "review", expectedRevision: 2 },
            { expectedStep: "review", nextStep: null, expectedRevision: 3 },
          ];
          for (const step of steps) {
            const response = await request.patch("/api/setup/step", {
              headers, data: { expectedUserId: user.id, ...step },
            });
            expect(response.status()).toBe(200);
          }
        },
      });
    } finally {
      await deleteAccount(user.id, password);
    }
  },
});
