import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { buildDemoRecipeIdeas } from "./demoRecipeIdeas.js";
import { requireDemoSeedTarget, requireSingleDemoOwner } from "./demoSeedGuard.js";
import { createAnonymizedSourceInvoices } from "./fixtures/anonymizedSourceInvoices.js";
import { createDemoRecipeIdeaSourceInvoices } from "./fixtures/demoRecipeIdeaSourceInvoices.js";
import { seedLocalDemoScenario } from "./localDemoScenario.js";
import { readSourceInvoices } from "./sourceInvoices.js";

function readTranscribedInvoices() {
  try {
    return readSourceInvoices();
  } catch {
    throw new Error("Lecture du corpus transcrit impossible ; aucune source n’a été chargée.");
  }
}

try {
  const [option, ...extra] = process.argv.slice(2);
  if (extra.length || (option !== undefined && option !== "--fixtures")) {
    throw new Error("Usage : node --import tsx server/src/scripts/seedLocalDemoScenario.ts [--fixtures].");
  }
  const fixtureOnly = option === "--fixtures";
  const ownerId = requireDemoSeedTarget(env.DATABASE_URL, env.NODE_ENV, process.env.LOCAL_DEMO_USER_ID);
  const users = await prisma.user.findMany({ select: { id: true } });
  requireSingleDemoOwner(ownerId, users);

  const invoices = fixtureOnly ? createAnonymizedSourceInvoices() : readTranscribedInvoices();
  const recipeIdeas = buildDemoRecipeIdeas(fixtureOnly ? createDemoRecipeIdeaSourceInvoices() : invoices);
  const { plan, recipeIdeaSources, recipeCandidates } = await seedLocalDemoScenario(ownerId, { invoices, recipeIdeas });
  console.info(JSON.stringify({
    mode: fixtureOnly ? "synthetic-fixtures" : "demo",
    counts: plan.counts,
    yearCoverage: plan.yearCoverage,
    recipeIdeaSourceDocuments: recipeIdeaSources.length,
    ...(!fixtureOnly ? { recipeIdeaEvidence: "transcriptions locales, non vérifiées sur les originaux" } : {}),
    pendingRecipeCandidates: recipeCandidates.filter((candidate) => candidate.status === "pending").length,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
