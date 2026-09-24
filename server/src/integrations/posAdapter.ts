import { z } from "zod";

const maxWindowDays = 31;

export const posSyncWindowSchema = z.object({ from: z.iso.date(), to: z.iso.date() }).strict()
  .superRefine(({ from, to }, context) => {
    if (from > to || Date.parse(to) - Date.parse(from) >= maxWindowDays * 86_400_000) {
      context.addIssue({ code: "custom", message: "La fenêtre POS doit couvrir de 1 à 31 jours." });
    }
  });

export const posRecordSchema = z.object({
  sourceRecordId: z.string().trim().min(1).max(160),
  revision: z.number().int().positive().max(1_000_000),
  serviceDate: z.iso.date(),
  externalItemId: z.string().trim().min(1).max(120).optional(),
  itemLabel: z.string().trim().min(1).max(120),
  quantity: z.number().int().positive().max(1_000_000),
  refunded: z.boolean(),
}).strict();

export const posSalesBatchSchema = z.object({
  batchId: z.string().trim().min(1).max(160),
  nextCursor: z.string().max(2000).nullable(),
  coverage: z.enum(["complete", "partial"]),
  records: z.array(posRecordSchema).max(5000),
}).strict().superRefine(({ records }, context) => {
  const ids = new Set<string>();
  records.forEach((record, index) => {
    if (ids.has(record.sourceRecordId)) context.addIssue({
      code: "custom", path: ["records", index, "sourceRecordId"], message: "Identifiant POS dupliqué dans le lot.",
    });
    ids.add(record.sourceRecordId);
  });
});

export type PosSyncWindow = z.infer<typeof posSyncWindowSchema>;
export type PosSalesRecord = z.infer<typeof posRecordSchema>;
export type PosSalesBatch = z.infer<typeof posSalesBatchSchema>;
export type PosUnavailableReason = "not_configured" | "temporary_error" | "invalid_data";

export type PosReadResult =
  | { status: "ok"; payload: unknown }
  | { status: "unavailable"; reason: PosUnavailableReason };

export interface PosAdapter {
  provider: string;
  provenance: "recorded_sales" | "demo_simulation";
  read(restaurantId: string, request: PosSyncWindow & { cursor: string | null }): Promise<PosReadResult>;
}

export const unconfiguredPosAdapter: PosAdapter = {
  provider: "generic",
  provenance: "recorded_sales",
  async read() { return { status: "unavailable", reason: "not_configured" }; },
};
