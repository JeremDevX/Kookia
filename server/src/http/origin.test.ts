import request from "supertest";
import { expect, it } from "vitest";
import { env } from "../config/env.js";
import { app } from "./app.js";

it("rejects PUT from a foreign origin and allows the configured origin through", async () => {
  const rejected = await request(app).put("/api/health").set("Origin", "https://attacker.example").expect(403);
  expect(rejected.body.error.code).toBe("FORBIDDEN_ORIGIN");
  await request(app).put("/api/health").set("Origin", env.APP_ORIGIN).expect(404);
});
