import { afterEach, expect, it, vi } from "vitest";

vi.mock("dotenv/config", () => ({}));

afterEach(() => vi.unstubAllEnvs());

it.each([
  ["http://127.0.0.1:5173/", "http://127.0.0.1:5173"],
  ["http://LOCALHOST:80", "http://localhost"],
  ["http://[::1]:80/", "http://[::1]"],
])("normalizes the allowed origin %s", async (input, origin) => {
  vi.stubEnv("DATABASE_URL", "postgresql://test@localhost/kookia_test");
  vi.stubEnv("APP_ORIGIN", input);
  vi.resetModules();

  const { env } = await import("./env.js");
  expect(env.APP_ORIGIN).toBe(origin);
});

it("rejects a loopback URL with a path", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://test@localhost/kookia_test");
  vi.stubEnv("APP_ORIGIN", "http://localhost:5173/workspace");
  vi.resetModules();

  await expect(import("./env.js")).rejects.toThrow("APP_ORIGIN must be an HTTP loopback origin");
});
