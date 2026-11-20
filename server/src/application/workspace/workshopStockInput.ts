import { z } from "zod";

const milli = z.number().int().min(0).max(1_000_000_000);
const lotDate = z.iso.date().refine(date => date >= "0001-01-01");
const lot = z.strictObject({
  reference: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/),
  receivedOn: lotDate,
  expiresOn: lotDate,
  unitCostCents: z.number().int().min(1).max(10_000_000),
  openingMilli: milli,
  addedMilli: milli,
  closingMilli: milli,
  lossMilli: milli,
  addition: z.enum(["delivery", "adjustment"]).nullable(),
  adjustmentOutMilli: milli.optional(),
}).refine(({ receivedOn, expiresOn, openingMilli, addedMilli, closingMilli, lossMilli, addition, adjustmentOutMilli = 0 }) =>
  receivedOn <= expiresOn && (openingMilli > 0) !== (addedMilli > 0)
  && (addedMilli > 0) === (addition !== null) && closingMilli + lossMilli + adjustmentOutMilli <= openingMilli + addedMilli);

const label = z.string().trim().min(1).max(120).refine(value => !/\p{Cc}/u.test(value));
const product = z.strictObject({
  name: label,
  unit: z.enum(["kg", "L", "pcs"]),
  supplier: label.optional(),
  lots: z.array(lot).max(100),
}).refine(({ unit, lots }) => unit !== "pcs" || lots.every(({ openingMilli, addedMilli, closingMilli, lossMilli, adjustmentOutMilli = 0 }) =>
  [openingMilli, addedMilli, closingMilli, lossMilli, adjustmentOutMilli].every(quantity => quantity % 1000 === 0)));

export const workshopStockSchema = z.array(product).min(1).max(25).refine(products => {
  const keys = products.map(({ name, unit }) => `${unit}:${name.toLocaleLowerCase("fr-FR")}`);
  const references = products.flatMap(({ lots }) => lots.map(({ reference }) => reference));
  return new Set(keys).size === keys.length && references.length <= 100 && new Set(references).size === references.length;
});

export type WorkshopStockInput = z.infer<typeof workshopStockSchema>;
