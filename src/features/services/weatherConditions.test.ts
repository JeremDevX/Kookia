import { expect, it } from "vitest";
import { weatherCondition } from "../../../shared/weatherConditions";

it("translates every documented WMO condition, including fog, freezing rain and hail", () => {
  const codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97, 99];
  expect(codes.every(code => weatherCondition(code).kind !== "unknown")).toBe(true);
  expect(weatherCondition(48)).toEqual({ label: "Brouillard givrant", kind: "fog" });
  expect(weatherCondition(66)).toEqual({ label: "Pluie verglaçante", kind: "rain" });
  expect(weatherCondition(99)).toEqual({ label: "Orage et forte grêle", kind: "storm" });
});
it("never substitutes sunshine for absent, unknown or invalid conditions", () => {
  for (const code of [null, undefined, 10, 45.5, -1, 100]) expect(weatherCondition(code).kind).toBe("unknown");
  expect(weatherCondition(0)).toEqual({ label: "Ciel dégagé", kind: "clear" });
});
