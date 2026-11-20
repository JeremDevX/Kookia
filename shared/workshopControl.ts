import { z } from "zod";
import { workshopForecastSchema } from "./workshopForecast.js";

const date = z.iso.date();
const stamp = z.iso.datetime();
const slot = z.enum(["lunch", "dinner"]);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const revision = z.number().int().nonnegative();
const quantity = z.number().nonnegative();

export const workshopWeeklyServiceSchema = z.strictObject({
  weekday: z.number().int().min(0).max(6), slot, opensAt: time, closesAt: time,
}).refine(({ opensAt, closesAt }) => opensAt < closesAt);

const knobs = {
  covers: z.number().int().min(5).max(200),
  incidentEvery: z.number().int().min(1).max(90),
};
export const workshopSettingsSchema = z.strictObject({ ...knobs, effectiveFrom: date.nullable(), revision });
export const workshopSettingsInputSchema = z.strictObject({ ...knobs, expectedRevision: revision });
export type WorkshopSettings = z.infer<typeof workshopSettingsSchema>;

const issue = z.strictObject({
  code: z.enum(["NETWORK", "STOCK_CONFLICT", "STOCK_SEQUENCE", "DAY_CONFLICT", "ORDER_CHANGED", "SERVICE_CONFLICT",
    "FORECAST", "INVALID_INPUT", "INTERRUPTED", "UNKNOWN"]),
  product: z.string().min(1).max(120).refine(value => !/\p{Cc}/u.test(value)).nullable(),
  status: z.number().int().min(400).max(599).nullable(),
});
export type WorkshopRunIssue = z.infer<typeof issue>;
const run = z.strictObject({
  id: z.uuid(), state: z.enum(["running", "succeeded", "failed"]), date: date.nullable(),
  step: z.enum(["prepare", "orders", "import", "forecast"]).nullable(), issue: issue.nullable(),
});
export const workshopRunEventSchema = run.refine(run => (run.state === "failed") === Boolean(run.issue));
export type WorkshopRunEvent = z.infer<typeof workshopRunEventSchema>;
const workshopRun = run.extend({ startedAt: stamp, finishedAt: stamp.nullable() });
export type WorkshopRun = z.infer<typeof workshopRun>;

export const workshopRunnerControlSchema = z.strictObject({
  settings: z.array(workshopSettingsSchema), weeklyServices: z.array(workshopWeeklyServiceSchema).max(14), retryRequested: z.boolean(),
});
export type WorkshopRunnerControl = z.infer<typeof workshopRunnerControlSchema>;

export const workshopControlSchema = z.strictObject({
  restaurant: z.strictObject({
    name: z.string(), mode: z.enum(["demo", "operational"]), city: z.string(), hasTerrace: z.boolean().nullable(),
    weeklyServices: z.array(workshopWeeklyServiceSchema).max(14),
  }),
  canManage: z.boolean(),
  transfer: z.strictObject({
    lastConfirmedDate: date.nullable(), lastConfirmedAt: stamp.nullable(),
    nextRun: z.strictObject({ date, time }).nullable(), lastRun: workshopRun.nullable(), missedDate: date.nullable(),
    retryRequested: z.boolean(), canRetry: z.boolean(),
  }),
  forecast: workshopForecastSchema.nullable(),
  purchases: z.strictObject({
    followValidated: z.boolean(),
    suggestions: z.array(z.strictObject({ name: z.string(), quantity, unit: z.string() })),
    orders: z.array(z.strictObject({ id: z.string(), orderId: z.string(), name: z.string(), supplier: z.string(),
      ordered: quantity, remaining: quantity, unit: z.string(), expectedDate: date.nullable() })),
    receipts: z.array(z.strictObject({ id: z.string(), orderId: z.string(), date, name: z.string(), supplier: z.string(),
      quantity, unit: z.string(), stockMovementId: z.string().nullable() })),
  }),
  history: z.array(z.strictObject({ date, confirmedAt: stamp, stock: z.boolean(), operations: z.boolean() })).max(30),
  settings: workshopSettingsSchema,
});
export type WorkshopControl = z.infer<typeof workshopControlSchema>;

export const workshopDayDetailsSchema = z.strictObject({
  date, confirmedAt: stamp,
  sections: z.strictObject({ sales: z.boolean(), stock: z.boolean(), operations: z.boolean() }),
  incident: z.enum(["normal", "short_delivery", "late_delivery", "unavailable", "high_waste", "refund", "stock_gap", "demand_shift"]).nullable(),
  events: z.array(z.string()),
  services: z.array(z.strictObject({ slot, covers: quantity.nullable(), note: z.string().nullable() })),
  sales: z.array(z.strictObject({ name: z.string(), quantity })),
  preparations: z.array(z.strictObject({ slot: slot.nullable(), name: z.string(), prepared: quantity, refused: quantity })),
  losses: z.array(z.strictObject({ name: z.string(), quantity, unit: z.string(), reason: z.string() })),
  stock: z.array(z.strictObject({ name: z.string(), unit: z.string(), supplier: z.string().nullable(),
    opening: quantity.nullable(), received: quantity, consumed: quantity, lost: quantity, adjustment: z.number(), closing: quantity.nullable() })),
});
export type WorkshopDayDetails = z.infer<typeof workshopDayDetailsSchema>;
