import { app } from "./http/app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";

const server = app.listen(env.PORT, () => console.log(`KookiA API listening on http://localhost:${env.PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
