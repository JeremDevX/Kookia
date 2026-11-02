import { describe, expect, it } from "vitest";
import { setupDestination, setupValues } from "./setupLogic";

describe("setup", () => {
  it("routes existing and new restaurants without a redirect loop", () => {
    expect(setupDestination(true, false)).toBe("continue");
    expect(setupDestination(false, false)).toBe("setup");
    expect(setupDestination(false, true)).toBe("continue");
    expect(setupDestination(true, true)).toBe("return");
  });
  it("sends covers as a number and preserves the terrace choice", () => {
    expect(setupValues({ name: "Restaurant", dailyCovers: "0", hasTerrace: "" })).toEqual({ name: "Restaurant", dailyCovers: 0, hasTerrace: null });
    expect(setupValues({ dailyCovers: "42", hasTerrace: "yes" }).hasTerrace).toBe(true);
    expect(setupValues({ dailyCovers: "42", hasTerrace: "no" }).hasTerrace).toBe(false);
  });
});
