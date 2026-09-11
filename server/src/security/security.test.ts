import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordHasher.js";
import { createSessionToken, hashSessionToken } from "./sessionToken.js";

describe("session and password security", () => {
  it("hashes and verifies passwords without storing the clear value", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("creates high-entropy tokens and stores only deterministic hashes", () => {
    const token = createSessionToken();
    expect(token).toHaveLength(64);
    expect(hashSessionToken(token)).toHaveLength(64);
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });
});
