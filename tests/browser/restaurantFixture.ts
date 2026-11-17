import { randomUUID } from "node:crypto";
import { expect, test as base } from "@playwright/test";

type TestRestaurant = {
  headers: { "X-Expected-User-Id": string };
  addFlour: (orderPackQuantity?: number) => Promise<{ productId: string; supplierId: string }>;
  completeSetup: () => Promise<void>;
};

export const test = base.extend<{ restaurant: TestRestaurant }>({
  restaurant: async ({ page }, provide) => {
    const request = page.request;
    const email = `restaurant-${randomUUID()}@example.test`;
    const password = "mot de passe du compte de test";
    const registration = await request.post("/api/auth/register", {
      data: { displayName: "Compte test", email, password },
    });
    expect(registration.status()).toBe(201);
    const { user } = await registration.json() as { user: { id: string } };
    const headers = { "X-Expected-User-Id": user.id };

    try {
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
      const cleanup = await request.delete("/api/account", { headers, data: { currentPassword: password } });
      expect(cleanup.status()).toBe(204);
    }
  },
});
