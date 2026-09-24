import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { seedLocalDemoScenario } from "./localDemoScenario.js";

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const database = new URL(env.DATABASE_URL);
const ownerId = process.env.LOCAL_DEMO_USER_ID;

if (!ownerId || env.NODE_ENV === "production" || !localHosts.has(database.hostname) ||
    decodeURIComponent(database.pathname.slice(1)) !== "kookia_demo") {
  throw new Error("La démonstration exige le bac local jetable kookia_demo.");
}

try {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length !== 1 || users[0].id !== ownerId) {
    throw new Error("Le bac démo doit contenir uniquement le compte local créé pour cette session.");
  }
  const { plan } = await seedLocalDemoScenario(ownerId);
  console.info(JSON.stringify({ mode: "demo", counts: plan.counts, yearCoverage: plan.yearCoverage }, null, 2));
} finally {
  await prisma.$disconnect();
}
