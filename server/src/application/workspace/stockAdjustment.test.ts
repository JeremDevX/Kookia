import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ tx: { $queryRaw: vi.fn(), stockMovement: { findUnique: vi.fn(), create: vi.fn() }, product: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() } }, lots: vi.fn() }));
vi.mock("../../infrastructure/database/prisma.js", () => ({ prisma: { $transaction: (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx) } }));
vi.mock("./lotService.js", () => ({ recordLotMovement: mocks.lots }));
import { adjustStock } from "./catalogService.js";

const product = { id: "p", name: "Tomate", category: "Frais", unit: "kg", stockRevision: 2, revision: 1,
  currentStock: new Prisma.Decimal(8), minThreshold: new Prisma.Decimal(1), pricePerUnit: new Prisma.Decimal(2), supplierId: "s", supplier: { name: "Fournisseur" } };
const run = (revision = 1, unit = "kg") => adjustStock("r", "u", "p", -2, "op", "loss", revision, unit);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.$queryRaw.mockResolvedValue([{ id: "p", stockRevision: 2, unit: "kg" }]);
  mocks.tx.stockMovement.findUnique.mockResolvedValue(null);
  mocks.tx.product.findUniqueOrThrow.mockResolvedValue(product);
  mocks.tx.product.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.stockMovement.create.mockResolvedValue({ id: "m" });
});
describe("ajustement : révision et rejeu", () => {
  it("refuse un premier envoi lorsque le stock ou son unité a changé", async () => {
    await expect(run()).rejects.toMatchObject({ code: "STOCK_CHANGED" });
    await expect(run(2, "L")).rejects.toMatchObject({ code: "STOCK_CHANGED" });
    expect(mocks.tx.product.updateMany).not.toHaveBeenCalled();
  });
  it("rejoue une opération déjà appliquée avant de vérifier la révision courante", async () => {
    mocks.tx.stockMovement.findUnique.mockResolvedValue({ delta: new Prisma.Decimal(-2), reason: "loss", productUnitSnapshot: "kg" });
    await expect(run()).resolves.toMatchObject({ id: "p", stockRevision: 2 });
    expect(mocks.tx.product.updateMany).not.toHaveBeenCalled();
  });
  it("refuse un rejeu dont la quantité ou l’unité diffère", async () => {
    mocks.tx.stockMovement.findUnique.mockResolvedValue({ delta: new Prisma.Decimal(-3), reason: "loss", productUnitSnapshot: "kg" });
    await expect(run()).rejects.toMatchObject({ code: "OPERATION_CONFLICT" });
    mocks.tx.stockMovement.findUnique.mockResolvedValue({ delta: new Prisma.Decimal(-2), reason: "loss", productUnitSnapshot: "L" });
    await expect(run()).rejects.toMatchObject({ code: "OPERATION_CONFLICT" });
  });
  it("applique une nouvelle intention lorsque la révision et l’unité concordent", async () => {
    await expect(run(2)).resolves.toMatchObject({ id: "p" });
    expect(mocks.tx.product.updateMany).toHaveBeenCalledOnce();
    expect(mocks.tx.stockMovement.create).toHaveBeenCalledOnce();
  });
});
