import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { sessionCookieName, env } from "../config/env.js";
import { AuthError } from "../domain/auth/errors.js";
import { changeEmail, changePassword, deleteAccount, getUserBySessionToken, loginUser, logout, registerUser, updateProfile } from "../application/auth/authService.js";
import { changeEmailSchema, changePasswordSchema, deleteAccountSchema, loginSchema, profileSchema, registerSchema } from "./schemas.js";
import { rateLimit } from "./rateLimit.js";
import { unconfiguredInvoiceExtractionAdapter, type InvoiceExtractionAdapter } from "../integrations/invoiceExtractionAdapter.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { createOpenMeteo } from "../integrations/openMeteo.js";
import type { WeatherProvider } from "../integrations/weatherProvider.js";

import { workspaceRoutes } from "./workspaceRoutes.js";
import { setupRoutes } from "./setupRoutes.js";
import { invitationAcceptRoutes } from "./invitationRoutes.js";
import { createWorkshopImportRoutes } from "./workshopImportRoutes.js";

const publicUserResponse = (user: Awaited<ReturnType<typeof getUserBySessionToken>>) => ({ user });
const setSessionCookie = (res: Response, token: string, expiresAt: Date) => res.cookie(sessionCookieName, token, { httpOnly: true, sameSite: "strict", secure: env.NODE_ENV === "production", path: "/", expires: expiresAt });
const clearSessionCookie = (res: Response) => res.clearCookie(sessionCookieName, { httpOnly: true, sameSite: "strict", secure: env.NODE_ENV === "production", path: "/" });
const checkDatabaseReadiness = async (): Promise<void> => { await prisma.$queryRaw`SELECT 1`; };
const configuredWeatherProvider = createOpenMeteo({ mode: env.OPEN_METEO_MODE, apiKey: env.OPEN_METEO_API_KEY });
const parseBody = <T>(schema: z.ZodType<T>, req: Request, res: Response): T | undefined => {
  const result = schema.safeParse(req.body);
  if (!result.success) { const fields: Record<string, string> = {}; result.error.issues.forEach((issue) => { const field = issue.path[0]; if (typeof field === "string" && !fields[field]) fields[field] = issue.message; }); res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides.", fields } }); return undefined; }
  return result.data;
};
const requireUser = async (req: Request) => getUserBySessionToken(req.cookies[sessionCookieName]);
const accountUserId = (res: Response): string => res.locals.accountUserId;
const matchesSession = (req: Request, res: Response, userId: string) => {
  if (req.get("X-Expected-User-Id") === userId) return true;
  res.status(409).json({ error: { code: "SESSION_CHANGED", message: "Votre session a changé. Rechargez la page avant de continuer." } });
  return false;
};

export function createApp(invoiceExtractionAdapter: InvoiceExtractionAdapter = unconfiguredInvoiceExtractionAdapter,
  databaseReadinessProbe: () => Promise<void> = checkDatabaseReadiness,
  weatherProvider: WeatherProvider = configuredWeatherProvider) {
  const app = express();
  app.disable("x-powered-by");
  const allowedOrigins = env.APP_ORIGIN === "http://127.0.0.1:5173"
    ? new Set(["http://localhost:5173", env.APP_ORIGIN])
    : new Set([env.APP_ORIGIN]);
  app.use("/api/workspace/inventory-session", express.json({ limit: "2mb", type: "application/json" }));
  app.use("/api/workspace/sales/imports", express.json({ limit: "512kb", type: "application/json" }));
  app.use("/api/integrations/workshop/days", express.json({ limit: "128kb", type: "application/json" }));
  // Cards with formulas and sheets with detailed notes can exceed the default limit.
  app.post("/api/workspace/service-menu", express.json({ limit: "1mb", type: "application/json" }));
  app.post("/api/workspace/services/sheet", express.json({ limit: "640kb", type: "application/json" }));
  app.use(express.json({ limit: "16kb", type: "application/json" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin && !allowedOrigins.has(origin)) {
        res.status(403).json({ error: { code: "FORBIDDEN_ORIGIN", message: "Origine de requête refusée." } });
        return;
      }
    }
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/ready", async (_req, res) => {
    try {
      await databaseReadinessProbe();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "not_ready" });
    }
  });

  app.post("/api/auth/register", rateLimit(8, 60_000), async (req, res) => {
    const body = parseBody(registerSchema, req, res); if (!body) return; const result = await registerUser(body.displayName, body.email, body.password); setSessionCookie(res, result.token, result.expiresAt); res.status(201).json(publicUserResponse(result.user));
  });
  app.post("/api/auth/login", rateLimit(8, 60_000), async (req, res) => {
    const body = parseBody(loginSchema, req, res); if (!body) return; const result = await loginUser(body.email, body.password); setSessionCookie(res, result.token, result.expiresAt); res.json(publicUserResponse(result.user));
  });
  app.post("/api/auth/logout", async (req, res) => {
    let user;
    try { user = await requireUser(req); }
    catch (error) {
      if (error instanceof AuthError && error.code === "UNAUTHENTICATED") { res.status(204).send(); return; }
      throw error;
    }
    if (!matchesSession(req, res, user.id)) return;
    await logout(req.cookies[sessionCookieName]); clearSessionCookie(res); res.status(204).send();
  });
  app.get("/api/auth/me", async (req, res) => { res.json(publicUserResponse(await requireUser(req))); });

  app.use("/api/account", async (req, res, next) => {
    const user = await requireUser(req);
    if (!matchesSession(req, res, user.id)) return;
    res.locals.accountUserId = user.id;
    next();
  });
  app.patch("/api/account/profile", async (req, res) => { const body = parseBody(profileSchema, req, res); if (!body) return; res.json(publicUserResponse(await updateProfile(accountUserId(res), body.displayName))); });
  app.post("/api/account/change-email", async (req, res) => { const body = parseBody(changeEmailSchema, req, res); if (!body) return; res.json(publicUserResponse(await changeEmail(accountUserId(res), body.newEmail, body.currentPassword))); });
  app.post("/api/account/change-password", rateLimit(8, 60_000), async (req, res) => { const body = parseBody(changePasswordSchema, req, res); if (!body) return; const result = await changePassword(accountUserId(res), body.currentPassword, body.newPassword); setSessionCookie(res, result.token, result.expiresAt); res.status(204).send(); });
  app.delete("/api/account", async (req, res) => { const body = parseBody(deleteAccountSchema, req, res); if (!body) return; await deleteAccount(accountUserId(res), body.currentPassword); clearSessionCookie(res); res.status(204).send(); });

  app.use((_, res, next) => {
    res.locals.invoiceExtractionAdapter = invoiceExtractionAdapter;
    res.locals.weatherProvider = weatherProvider;
    next();
  });
  app.use("/api/setup", setupRoutes);
  app.use("/api/invitations", invitationAcceptRoutes);
  app.use("/api/workspace", workspaceRoutes);
  if (env.WORKSHOP_IMPORT_TOKEN && env.WORKSHOP_IMPORT_RESTAURANT_ID) {
    app.use("/api/integrations/workshop", createWorkshopImportRoutes(env.WORKSHOP_IMPORT_TOKEN, env.WORKSHOP_IMPORT_RESTAURANT_ID,
      env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE === "true", env.WORKSHOP_FORECAST_ENABLED === "true"));
  }

  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") { res.status(413).json({ error: { code: "TOO_LARGE", message: "Les données sont trop volumineuses pour être enregistrées." } }); return; }
    if (error && typeof error === "object" && "type" in error && error.type === "entity.parse.failed") { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return; }
    if (error instanceof AuthError) { const status = error.code === "EMAIL_ALREADY_USED" ? 409 : error.code === "UNAUTHENTICATED" || error.code === "INVALID_CREDENTIALS" || error.code === "INVALID_CURRENT_PASSWORD" ? 401 : 400; res.status(status).json({ error: { code: error.code, message: error.message } }); return; }
    console.error("Unhandled API error", error instanceof Error ? error.message : "unknown error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." } });
  });
  return app;
}

export const app = createApp();
