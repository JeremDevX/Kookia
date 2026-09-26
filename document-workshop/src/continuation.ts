import { z } from "zod";
import { ingredients, suppliers } from "./catalog";
import { offsetDate } from "./calendar";
import type { Checkpoint } from "./model";
import { getOrderStep, isOrderQuantity } from "../../shared/orderQuantity";

export const MAX_CHECKPOINT_BYTES = 25 * 1024 * 1024;
// Identifiers become document/ZIP paths: never accept separators or dot segments.
const date = z.iso.date(), text = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/);
const amount = z.number().positive().max(1_000_000).refine(n => Math.abs(n * 1000 - Math.round(n * 1000)) < .000001);
const price = z.number().int().positive().max(10_000_000);
const productId = z.string().refine(id => ingredients.some(p => p.id === id));
const lot = z.object({ id: text, productId, receivedOn: date, expiresOn: date, quantity: amount, unitCost: price }).strict();
const purchase = z.object({
  id: text, supplierId: z.string().refine(id => suppliers.some(s => s.id === id)),
  placedOn: date, expectedOn: date, deliveryOn: date, receivedOn: z.null(), invoiceOn: z.null(),
  time: z.string().regex(/^(0[7-9]):[0-5][0-9]$/), delayed: z.boolean(), note: z.string().max(500),
  lines: z.array(z.object({ productId, ordered: amount, received: z.literal(0), shortage: z.literal(0), unitPrice: price }).strict()).min(1).max(ingredients.length),
}).strict();
const schema = z.object({
  version: z.literal(2), catalogVersion: z.literal(2), asOf: date, originStart: date,
  seed: z.number().int().min(1).max(999999), dossier: text,
  lots: z.array(lot).max(1000), pendingOrders: z.array(purchase).max(30),
}).strict().superRefine((value, ctx) => {
  const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
  if (value.originStart > value.asOf) invalid("Début postérieur à la clôture.");
  if (new Set(value.lots.map(l => l.id)).size !== value.lots.length) invalid("Lot dupliqué.");
  if (new Set(value.pendingOrders.map(p => p.id)).size !== value.pendingOrders.length) invalid("Commande dupliquée.");
  for (const l of value.lots) if (l.receivedOn > value.asOf || l.expiresOn < l.receivedOn || l.expiresOn < value.asOf) invalid("Dates de lot incohérentes.");
  for (const p of value.pendingOrders) {
    if (p.placedOn > value.asOf || p.expectedOn <= p.placedOn || p.deliveryOn < p.expectedOn || p.deliveryOn <= value.asOf) invalid("Dates de commande incohérentes.");
    if (new Set(p.lines.map(l => l.productId)).size !== p.lines.length) invalid("Ligne de commande dupliquée.");
    for (const l of p.lines) {
      const product = ingredients.find(i => i.id === l.productId);
      if (!product || product.supplier !== p.supplierId || !isOrderQuantity(l.ordered, getOrderStep(product))) invalid("Produit, fournisseur ou pas de commande incompatible.");
    }
  }
});
export function validateCheckpoint(value: unknown): Checkpoint {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error("Reprise impossible : utilisez un stock-reprise.json de l'atelier version 2, avec lots, quantités, dates et commandes cohérents. Les anciens dossiers restent consultables mais ne permettent pas cette reprise automatique.");
  return result.data;
}
export function parseCheckpointFile(contents: string): Checkpoint {
  if (new TextEncoder().encode(contents).length > MAX_CHECKPOINT_BYTES) throw new Error("Fichier trop volumineux (25 Mo maximum). Choisissez stock-reprise.json.");
  let value: unknown;
  try { value = JSON.parse(contents); }
  catch { throw new Error("Fichier JSON illisible. Choisissez stock-reprise.json ou scenario.json de l'atelier."); }
  const envelope = z.object({ checkpoint: z.unknown() }).safeParse(value);
  return validateCheckpoint(envelope.success ? envelope.data.checkpoint : value);
}
export function continuationStart(checkpoint: Checkpoint) {
  const next = offsetDate(checkpoint.asOf, 1);
  if (!z.iso.date().safeParse(next).success) throw new Error("La date suivant ce dossier dépasse les dates prises en charge.");
  return next;
}
