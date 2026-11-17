import type { Prisma } from "@prisma/client";

export const lossMovementReasons = ["loss", "simulation_loss"];

export function legacyLossCost(quantity: Prisma.Decimal, unitPriceSnapshot: Prisma.Decimal | null) {
  return unitPriceSnapshot?.mul(quantity) ?? null;
}
