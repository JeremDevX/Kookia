import { describe, expect, it } from "vitest";
import { requireDemoSeedTarget, requireSingleDemoOwner } from "./demoSeedGuard.js";

const demo = "postgresql://kookia:temporary@127.0.0.1:5432/kookia_demo";
describe("demo seed guard", () => {
  it("accepts only the identified owner in the local development demo database", () => {
    expect(requireDemoSeedTarget(demo, "development", "owner")).toBe("owner");
    for (const url of ["", "https://127.0.0.1/kookia_demo", "postgresql://example.com/kookia_demo",
      "postgresql://127.0.0.1/kookia", `${demo}?schema=other`]) {
      expect(() => requireDemoSeedTarget(url, "development", "owner")).toThrow();
    }
    expect(() => requireDemoSeedTarget(demo, "production", "owner")).toThrow();
    expect(() => requireDemoSeedTarget(demo, "development", undefined)).toThrow();
  });
  it("rejects missing, different or additional accounts before seeding", () => {
    expect(() => requireSingleDemoOwner("owner", [{ id: "owner" }])).not.toThrow();
    for (const users of [[], [{ id: "other" }], [{ id: "owner" }, { id: "other" }]]) {
      expect(() => requireSingleDemoOwner("owner", users)).toThrow();
    }
  });
});
