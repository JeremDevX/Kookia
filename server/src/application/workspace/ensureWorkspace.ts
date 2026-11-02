import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { seedDemoCatalog } from "./seedDemoCatalog.js";

// Seed only once per account. The complete graph is committed atomically.
export async function ensureWorkspace(ownerId: string) {
  const existing = await prisma.restaurant.findUnique({ where: { ownerId } });
  if (existing) return existing;
  try {
    return await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({ data: {
        ownerId, name: "La Pizzeria de Camille", type: "Pizzeria / Crêperie",
        address: "12 Rue de Grenoble, 38000 Grenoble", city: "Grenoble",
        phone: "+33 1 23 45 67 89", email: "contact@example.com", dailyCovers: 350,
      } });
      await seedDemoCatalog(tx, restaurant.id);
      return restaurant;
    });
  } catch (error) {
    // Concurrent first requests may race on the owner unique constraint.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.restaurant.findUnique({ where: { ownerId } });
      if (winner) return winner;
    }
    throw error;
  }
}
