import { validateIntegrationDatabaseUrl } from "../../scripts/integrationDatabaseGuard.mjs";

validateIntegrationDatabaseUrl(process.env.DATABASE_URL);
await import("../../server/src/index.js");
