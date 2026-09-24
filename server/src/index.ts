import { app } from "./http/app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";

const server = app.listen(env.PORT, env.HOST, () => console.log(`KookiA API listening on http://${env.HOST}:${env.PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
