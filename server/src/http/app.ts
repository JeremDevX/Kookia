import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { sessionCookieName, env } from "../config/env.js";
import { AuthError } from "../domain/auth/errors.js";
import { changeEmail, changePassword, deleteAccount, getUserBySessionToken, loginUser, logout, registerUser, updateProfile } from "../application/auth/authService.js";
import { changeEmailSchema, changePasswordSchema, deleteAccountSchema, loginSchema, profileSchema, registerSchema } from "./schemas.js";
import { rateLimit } from "./rateLimit.js";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb", type: "application/json" }));
app.use(cookieParser());
app.use((req, res, next) => {
  if (["POST", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && !["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin)) {
      res.status(403).json({ error: { code: "FORBIDDEN_ORIGIN", message: "Origine de requête refusée." } });
      return;
    }
  }
  next();
});

const publicUserResponse = (user: Awaited<ReturnType<typeof getUserBySessionToken>>) => ({ user });
const setSessionCookie = (res: Response, token: string, expiresAt: Date) => res.cookie(sessionCookieName, token, { httpOnly: true, sameSite: "strict", secure: env.NODE_ENV === "production", path: "/", expires: expiresAt });
const clearSessionCookie = (res: Response) => res.clearCookie(sessionCookieName, { httpOnly: true, sameSite: "strict", secure: env.NODE_ENV === "production", path: "/" });
const parseBody = <T>(schema: z.ZodType<T>, req: Request, res: Response): T | undefined => {
  const result = schema.safeParse(req.body);
  if (!result.success) { const fields: Record<string, string> = {}; result.error.issues.forEach((issue) => { const field = issue.path[0]; if (typeof field === "string" && !fields[field]) fields[field] = issue.message; }); res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides.", fields } }); return undefined; }
  return result.data;
};
const requireUser = async (req: Request) => getUserBySessionToken(req.cookies[sessionCookieName]);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", rateLimit(8, 60_000), async (req, res, next) => {
  try { const body = parseBody(registerSchema, req, res); if (!body) return; const result = await registerUser(body.displayName, body.email, body.password); setSessionCookie(res, result.token, result.expiresAt); res.status(201).json(publicUserResponse(result.user)); } catch (error) { next(error); }
});
app.post("/api/auth/login", rateLimit(8, 60_000), async (req, res, next) => {
  try { const body = parseBody(loginSchema, req, res); if (!body) return; const result = await loginUser(body.email, body.password); setSessionCookie(res, result.token, result.expiresAt); res.json(publicUserResponse(result.user)); } catch (error) { next(error); }
});
app.post("/api/auth/logout", async (req, res, next) => { try { await logout(req.cookies[sessionCookieName]); clearSessionCookie(res); res.status(204).send(); } catch (error) { next(error); } });
app.get("/api/auth/me", async (req, res, next) => { try { res.json(publicUserResponse(await requireUser(req))); } catch (error) { next(error); } });

app.patch("/api/account/profile", async (req, res, next) => { try { const body = parseBody(profileSchema, req, res); if (!body) return; const user = await requireUser(req); res.json(publicUserResponse(await updateProfile(user.id, body.displayName))); } catch (error) { next(error); } });
app.post("/api/account/change-email", async (req, res, next) => { try { const body = parseBody(changeEmailSchema, req, res); if (!body) return; const user = await requireUser(req); res.json(publicUserResponse(await changeEmail(user.id, body.newEmail, body.currentPassword))); } catch (error) { next(error); } });
app.post("/api/account/change-password", rateLimit(8, 60_000), async (req, res, next) => { try { const body = parseBody(changePasswordSchema, req, res); if (!body) return; const user = await requireUser(req); const result = await changePassword(user.id, body.currentPassword, body.newPassword, req.cookies[sessionCookieName]); setSessionCookie(res, result.token, result.expiresAt); res.status(204).send(); } catch (error) { next(error); } });
app.delete("/api/account", async (req, res, next) => { try { const body = parseBody(deleteAccountSchema, req, res); if (!body) return; const user = await requireUser(req); await deleteAccount(user.id, body.currentPassword); clearSessionCookie(res); res.status(204).send(); } catch (error) { next(error); } });

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  if (error instanceof AuthError) { const status = error.code === "EMAIL_ALREADY_USED" ? 409 : error.code === "UNAUTHENTICATED" || error.code === "INVALID_CREDENTIALS" || error.code === "INVALID_CURRENT_PASSWORD" ? 401 : 400; res.status(status).json({ error: { code: error.code, message: error.message } }); return; }
  console.error("Unhandled API error", error instanceof Error ? error.message : "unknown error");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." } });
});

export { clearSessionCookie, setSessionCookie };
