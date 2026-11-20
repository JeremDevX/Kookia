import { describe, expect, it } from "vitest";
import { workshopView } from "./workshopView";

describe("workshop view", () => {
  it("opens the export offline and the automatic view at the hosted entry point", () => {
    expect(workshopView({ pathname: "/", search: "" })).toBe("export");
    expect(workshopView({ pathname: "/generateur/", search: "" })).toBe("automatique");
  });

  it("honors explicit navigation in both environments", () => {
    expect(workshopView({ pathname: "/", search: "?vue=automatique" })).toBe("automatique");
    expect(workshopView({ pathname: "/generateur/", search: "?vue=export" })).toBe("export");
  });
});
