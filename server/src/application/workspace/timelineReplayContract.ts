import { z } from "zod";

const nonnegative = z.number().finite().min(0);
const productId = z.string().trim().min(1).max(100);
const suggestionKey = z.string().regex(/^[a-f0-9]{64}$/);
const suggestionSchema = z.object({
  suggestionKey,
  productId,
  productName: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(24),
  status: z.enum(["ready", "needs_stock_count", "covered", "unit_mismatch"]),
  canAdd: z.boolean(),
  forecastNeed: nonnegative,
  countedStock: nonnegative.nullable(),
  countDate: z.iso.date().nullable(),
  estimatedQuantity: nonnegative.nullable(),
  currentUnitPrice: nonnegative,
  estimatedCost: nonnegative.nullable(),
  reason: z.string().max(1000),
});

export const purchaseDecisionSnapshotSchema = z.object({
  suggestionKey,
  productId,
  quantity: z.number().finite().positive().max(1_000_000).nullable(),
  suggestion: suggestionSchema,
  provenance: z.enum(["recorded_sales", "demo_simulation", "mixed"]),
  workspaceMode: z.enum(["operational", "demo"]),
  model: z.string().trim().min(1).max(120),
  asOfDate: z.iso.date(),
  forecastDate: z.iso.date(),
}).refine((snapshot) => snapshot.suggestionKey === snapshot.suggestion.suggestionKey &&
  snapshot.productId === snapshot.suggestion.productId, "L’instantané de décision est incohérent.");

export const timelineReplaySchema = z.object({
  schemaVersion: z.literal(1),
  id: z.uuid(),
  sourceDecisionId: z.uuid(),
  sourceDecisionAt: z.iso.datetime(),
  decision: z.enum(["purchase_suggestion_added", "purchase_suggestion_excluded"]),
  provenance: z.enum(["recorded_sales", "demo_simulation", "mixed"]),
  workspaceMode: z.enum(["operational", "demo"]),
  model: z.string(),
  asOfDate: z.iso.date(),
  forecastDate: z.iso.date(),
  suggestion: suggestionSchema,
  sandboxOutcome: z.object({
    kind: z.enum(["draft_line", "excluded"]),
    quantity: z.number().finite().positive().max(1_000_000).nullable(),
    currentUnitPrice: nonnegative,
    estimatedCost: nonnegative.nullable(),
  }).strict(),
}).strict();

export type TimelineReplayData = z.infer<typeof timelineReplaySchema>;

export function buildTimelineReplay(input: {
  id: string;
  decisionId: string;
  decision: string;
  createdAt: Date;
  snapshot: unknown;
}): TimelineReplayData | null {
  if (input.decision !== "purchase_suggestion_added" && input.decision !== "purchase_suggestion_excluded") return null;
  const snapshot = purchaseDecisionSnapshotSchema.safeParse(input.snapshot);
  if (!snapshot.success) return null;
  const added = input.decision === "purchase_suggestion_added";
  const quantity = snapshot.data.quantity;
  if (added ? quantity === null || !snapshot.data.suggestion.canAdd ||
      snapshot.data.suggestion.status !== "ready" || snapshot.data.suggestion.estimatedQuantity === null
    : quantity !== null) return null;
  const estimatedCost = added
    ? Math.round((quantity! * snapshot.data.suggestion.currentUnitPrice + Number.EPSILON) * 100) / 100
    : null;
  return timelineReplaySchema.parse({
    schemaVersion: 1,
    id: input.id,
    sourceDecisionId: input.decisionId,
    sourceDecisionAt: input.createdAt.toISOString(),
    decision: input.decision,
    provenance: snapshot.data.provenance,
    workspaceMode: snapshot.data.workspaceMode,
    model: snapshot.data.model,
    asOfDate: snapshot.data.asOfDate,
    forecastDate: snapshot.data.forecastDate,
    suggestion: snapshot.data.suggestion,
    sandboxOutcome: {
      kind: added ? "draft_line" : "excluded",
      quantity,
      currentUnitPrice: snapshot.data.suggestion.currentUnitPrice,
      estimatedCost,
    },
  });
}
