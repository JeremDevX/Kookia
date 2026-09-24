import { expect, it } from "vitest";
import { posSalesBatchSchema, posSyncWindowSchema } from "./posAdapter.js";

it("limits POS queries to a bounded chronological window", () => {
  expect(posSyncWindowSchema.safeParse({ from: "2026-09-01", to: "2026-10-01" }).success).toBe(true);
  expect(posSyncWindowSchema.safeParse({ from: "2026-09-01", to: "2026-10-02" }).success).toBe(false);
  expect(posSyncWindowSchema.safeParse({ from: "2026-09-02", to: "2026-09-01" }).success).toBe(false);
});

it("rejects duplicate POS identities and invalid external rows at the adapter boundary", () => {
  const row = { sourceRecordId: "sale-1", revision: 1, serviceDate: "2026-09-24", externalItemId: "item-1",
    itemLabel: "Pizza", quantity: 3, refunded: false };
  expect(posSalesBatchSchema.safeParse({ batchId: "batch-1", nextCursor: "cursor-1", coverage: "partial", records: [row] }).success).toBe(true);
  expect(posSalesBatchSchema.safeParse({ batchId: "batch-1", nextCursor: null, coverage: "complete", records: [row, row] }).success).toBe(false);
  expect(posSalesBatchSchema.safeParse({ batchId: "batch-1", nextCursor: null, coverage: "complete", records: [{ ...row, quantity: -1 }] }).success).toBe(false);
});
