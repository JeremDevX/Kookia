import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, registerSchema } from "./schemas.js";

describe("authentication input contracts", () => {
  it("requires a strong enough password and a matching basic registration shape", () => {
    expect(registerSchema.safeParse({ displayName: "Jean", email: "jean@example.com", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ displayName: "Jean", email: " jean@example.com ", password: "valid password" }).success).toBe(true);
  });
  it("does not apply registration password rules to the login payload", () => {
    expect(loginSchema.safeParse({ email: "jean@example.com", password: "x" }).success).toBe(true);
  });
  it("limits absurd passwords", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "valid", newPassword: "a".repeat(257) }).success).toBe(false);
  });
  it("rejects unexpected input fields at the transport boundary", () => {
    expect(loginSchema.safeParse({ email: "jean@example.com", password: "x", token: "unexpected" }).success).toBe(false);
  });
});
