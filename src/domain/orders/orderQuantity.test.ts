import { expect, it } from "vitest";
import { isValidOrderQuantity } from "./orderQuantity.js";

it("accepts only positive quantities with at most three decimals and within the API limit", () => {
  expect(isValidOrderQuantity("0.001")).toBe(true);
  expect(isValidOrderQuantity("12")).toBe(true);
  expect(isValidOrderQuantity("1.0001")).toBe(false);
  expect(isValidOrderQuantity("0")).toBe(false);
  expect(isValidOrderQuantity("1000001")).toBe(false);
});
