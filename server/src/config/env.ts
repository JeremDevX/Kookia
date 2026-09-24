import "dotenv/config";
import { z } from "zod";

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  HOST: z.string().min(1).default("127.0.0.1"),
  APP_ORIGIN: z.string().url().default("http://127.0.0.1:5173").refine((value) => {
    const origin = new URL(value);
    return origin.protocol === "http:" && localHosts.has(origin.hostname) && origin.pathname === "/" &&
      !origin.search && !origin.hash && !origin.username && !origin.password;
  }, "APP_ORIGIN must be an HTTP loopback origin"),
  PORT: z.coerce.number().int().positive().default(3001),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
export const sessionCookieName = "kookia_session";
