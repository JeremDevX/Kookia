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
  OPEN_METEO_MODE: z.enum(["disabled", "evaluation", "commercial"]).default("disabled"),
  OPEN_METEO_API_KEY: z.string().min(1).optional(),
  WORKSHOP_IMPORT_TOKEN: z.string().regex(/^[A-Za-z0-9._~+/=-]{32,256}$/).optional(),
  WORKSHOP_IMPORT_RESTAURANT_ID: z.uuid().optional(),
  WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: z.literal("true").optional(),
}).refine(value => value.OPEN_METEO_MODE !== "commercial" || Boolean(value.OPEN_METEO_API_KEY),
  { message: "OPEN_METEO_API_KEY is required for commercial weather access", path: ["OPEN_METEO_API_KEY"] })
  .refine(value => Boolean(value.WORKSHOP_IMPORT_TOKEN) === Boolean(value.WORKSHOP_IMPORT_RESTAURANT_ID),
    { message: "Configure the workshop import token and test restaurant ID together", path: ["WORKSHOP_IMPORT_TOKEN"] })
  .refine(value => !value.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE || Boolean(value.WORKSHOP_IMPORT_RESTAURANT_ID),
    { message: "An explicitly configured test restaurant is required", path: ["WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE"] });

export const env = envSchema.parse(process.env);
export const sessionCookieName = "kookia_session";
