import { z } from "zod";

const date = z.iso.date().refine(value => value >= "0001-01-01");
const label = z.string().trim().min(1).max(120).refine(value => !/\p{Cc}/u.test(value));
const covers = z.number().int().min(0).max(10_000);
const amount = z.number().int().min(0).max(1_000_000_000);
const dayMs = 86_400_000;
const stamp = (value: string) => Date.parse(`${value}T00:00:00.000Z`);
const normalized = (value: string) => value.normalize("NFC").toLocaleLowerCase("fr-FR");

export const workshopForecastSchema = z.strictObject({
  provenance: z.literal("demo_simulation"),
  date,
  basedOnDate: date,
  covers,
  revenueCents: amount,
  hours: z.array(z.strictObject({ hour: z.number().int().min(0).max(23), covers })).max(24),
  products: z.array(z.strictObject({
    name: label, supplier: label, unit: z.enum(["kg", "L", "pcs"]), quantityMilli: amount.min(1), deliveryDate: date,
  })).max(32),
}).refine(({ date, basedOnDate }) => stamp(date) - stamp(basedOnDate) === dayMs)
  .refine(({ covers, hours }) => new Set(hours.map(row => row.hour)).size === hours.length &&
    hours.reduce((sum, row) => sum + row.covers, 0) === covers)
  .refine(({ date, products }) => {
    const keys = products.map(row => JSON.stringify([normalized(row.name), normalized(row.supplier), row.unit, row.deliveryDate]));
    const start = stamp(date);
    return new Set(keys).size === products.length && products.every(row => {
      const offset = stamp(row.deliveryDate) - start;
      return offset >= 0 && offset <= 31 * dayMs && (row.unit !== "pcs" || row.quantityMilli % 1000 === 0);
    });
  });

export type WorkshopForecast = z.infer<typeof workshopForecastSchema>;
