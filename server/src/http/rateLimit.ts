import type { Request, Response, NextFunction } from "express";

type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();

export const rateLimit = (limit: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const key = `${req.ip ?? "unknown"}:${req.path}`;
  const now = Date.now();
  const current = entries.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  entries.set(key, entry);
  if (entry.count > limit) { res.status(429).json({ error: { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." } }); return; }
  next();
};
