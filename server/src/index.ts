import { createApp } from "./http/app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { localDemoInvoiceExtractionAdapter } from "./integrations/localDemoInvoiceExtractionAdapter.js";

const invoiceExtractionAdapter = env.NODE_ENV === "development" && process.env.LOCAL_DEMO_INVOICE_FIXTURE === "true"
  ? localDemoInvoiceExtractionAdapter
  : undefined;
const app = createApp(invoiceExtractionAdapter);
const server = app.listen(env.PORT, env.HOST, () => console.log(`KookiA API listening on http://${env.HOST}:${env.PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
