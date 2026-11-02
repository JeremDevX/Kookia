import { expect, it } from "vitest";
import { matchesReceiptStatus } from "./receiptStatus";

it("inclut les commandes simulées dans le filtre correspondant sans les confondre avec les réelles", () => {
  expect(matchesReceiptStatus("simulated", "pending")).toBe(true);
  expect(matchesReceiptStatus("simulated_partially_received", "pending")).toBe(true);
  expect(matchesReceiptStatus("simulated_received", "received")).toBe(true);
  expect(matchesReceiptStatus("simulated_received", "pending")).toBe(false);
  expect(matchesReceiptStatus("validated", "received")).toBe(false);
});
