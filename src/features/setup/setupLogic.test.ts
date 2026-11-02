import { describe, expect, it } from "vitest";
import { setupDestination, setupValues } from "./setupLogic";

describe("setup", () => {
  it("routes existing and new restaurants without a redirect loop", () => {
    expect(setupDestination(true, null, false)).toBe("continue");
    expect(setupDestination(false, null, false)).toBe("setup");
    expect(setupDestination(false, null, true)).toBe("continue");
    expect(setupDestination(true, null, true)).toBe("return");
    expect(setupDestination(true, "team", false)).toBe("setup");
    expect(setupDestination(true, "suppliers", true)).toBe("continue");
    expect(setupDestination(true, "review", false)).toBe("setup");
  });
  it("sends covers as a number and preserves the terrace choice", () => {
    expect(setupValues({ name: "Restaurant", dailyCovers: "0", hasTerrace: "" })).toEqual({ name: "Restaurant", dailyCovers: 0, hasTerrace: null });
    expect(setupValues({ dailyCovers: "42", hasTerrace: "yes" }).hasTerrace).toBe(true);
    expect(setupValues({ dailyCovers: "42", hasTerrace: "no" }).hasTerrace).toBe(false);
  });
});
