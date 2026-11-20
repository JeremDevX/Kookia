import { z } from "zod";

const label = z.string().trim().min(1).max(120).refine(value => !/\p{Cc}/u.test(value));
const approvedLine = z.strictObject({
  orderId: z.uuid(), lineId: z.uuid(), orderedOn: z.iso.date(), dueOn: z.iso.date(),
  name: label, unit: z.enum(["kg", "L", "pcs"]), supplier: label,
  quantityMilli: z.number().int().min(1).max(1_000_000_000),
  unitPriceCents: z.number().int().min(1).max(10_000_000),
}).refine(line => line.dueOn > line.orderedOn && (line.unit !== "pcs" || line.quantityMilli % 1000 === 0));

export const workshopApprovedOrdersSchema = z.array(approvedLine).max(16)
  .refine(lines => new Set(lines.map(line => line.lineId)).size === lines.length);
export type WorkshopApprovedLine = z.infer<typeof approvedLine>;

export const workshopApprovedPurchaseReference = (date: string, lineId: string) => `BC-KOOKIA-${date}-${lineId}`;
