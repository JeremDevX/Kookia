import { z } from "zod";

const label = z.string().trim().min(1).max(120).refine(value => !/\p{Cc}/u.test(value));
const note = z.string().trim().max(500).refine(value => !/\p{Cc}/u.test(value));
const reference = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,99}$/i);
const date = z.iso.date().refine(value => value >= "0001-01-01");
const unit = z.enum(["kg", "L", "pcs"]);
const slot = z.enum(["lunch", "dinner"]);
const milli = z.number().int().min(0).max(1_000_000_000);
const cents = z.number().int().min(1).max(10_000_000);
const portions = z.number().int().min(0).max(10_000);
const unique = (keys: string[]) => new Set(keys).size === keys.length;

const purchaseLine = z.strictObject({ name: label, unit, orderedMilli: milli.min(1), receivedMilli: milli, unitPriceCents: cents })
  .refine(line => line.receivedMilli <= line.orderedMilli && (line.unit !== "pcs" || line.orderedMilli % 1000 === 0 && line.receivedMilli % 1000 === 0));
const purchase = z.strictObject({
  reference, supplier: label, orderedOn: date, expectedOn: date,
  receipt: z.strictObject({ deliveryReference: reference, invoiceReference: reference, invoiceOn: date }).nullable(),
  lines: z.array(purchaseLine).min(1).max(25),
}).refine(row => row.orderedOn <= row.expectedOn && unique(row.lines.map(line => line.name)) &&
  (row.receipt !== null || row.lines.every(line => line.receivedMilli === 0)));

const item = z.strictObject({ name: label, category: z.enum(["Entrée", "Plat", "Dessert", "Boisson"]), priceCents: cents,
  prepTime: z.number().int().min(0).max(1440), planned: portions, prepared: portions, sold: portions, refused: portions })
  .refine(row => row.sold <= row.prepared);
const service = z.strictObject({ slot, covers: portions, items: z.array(item).max(25) })
  .refine(row => unique(row.items.map(entry => entry.name)));
const loss = z.strictObject({ kind: z.enum(["raw", "preparation", "unsold", "plate_return"]), slot: slot.nullable(),
  recipe: label.nullable(), product: label.nullable(), supplier: label.optional(), lotReference: reference.nullable(), quantityMilli: milli.min(1),
  unit: z.enum(["kg", "L", "pcs", "portion"]), avoidable: z.boolean(), note })
  .refine(row => !row.supplier || Boolean(row.product))
  .refine(row => row.kind === "raw" ? Boolean(row.product && row.lotReference && !row.recipe && row.unit !== "portion") :
    Boolean(row.recipe && row.slot && (row.kind === "preparation" ? row.product && row.unit !== "portion" : !row.product && row.unit === "portion")));

export const workshopOperationsSchema = z.strictObject({
  purchases: z.array(purchase).max(16),
  services: z.array(service).max(2),
  losses: z.array(loss).max(180),
  incident: z.enum(["normal", "short_delivery", "late_delivery", "unavailable", "high_waste", "refund", "stock_gap", "demand_shift"]),
  events: z.array(note).max(100),
}).refine(value => unique(value.purchases.map(row => row.reference)) && unique(value.services.map(row => row.slot)));

export type WorkshopOperationsInput = z.infer<typeof workshopOperationsSchema>;
