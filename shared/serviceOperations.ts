import { z } from "zod";
import type { ServiceSlot } from "./serviceCalendar.js";

export const slotSchema = z.enum(["lunch", "dinner"]);
export const menuEntrySchema = z.object({
  id: z.uuid(), name: z.string().trim().min(1).max(120),
  category: z.enum(["Entrée", "Plat", "Dessert", "Boisson", "Formule"]),
  saleItemId: z.string().min(1).max(100).nullable(), available: z.boolean(),
  priceCents: z.number().int().min(0).max(1_000_000),
  components: z.array(z.object({ recipeId: z.string().min(1).max(100),
    portions: z.number().finite().positive().max(100).multipleOf(.001) }).strict()).min(1).max(20),
}).strict().superRefine((entry, ctx) => {
  if (new Set(entry.components.map(c => c.recipeId)).size !== entry.components.length)
    ctx.addIssue({ code: "custom", message: "Une recette ne doit apparaître qu'une fois par article." });
  if (entry.category !== "Formule" && entry.components.length !== 1)
    ctx.addIssue({ code: "custom", message: "Un article simple correspond à une seule recette." });
});
export const menuInputSchema = z.object({
  operationId: z.uuid(), expectedRevision: z.number().int().nonnegative(),
  serviceDate: z.iso.date(), slot: slotSchema,
  entries: z.array(menuEntrySchema).max(60), note: z.string().trim().max(2000),
}).strict().superRefine((input, ctx) => {
  const ids = input.entries.map(e => e.id), sales = input.entries.flatMap(e => e.saleItemId ? [e.saleItemId] : []);
  if (new Set(ids).size !== ids.length || new Set(sales).size !== sales.length)
    ctx.addIssue({ code: "custom", message: "Articles de carte ou correspondances de vente dupliqués." });
});
export type MenuEntryInput = z.infer<typeof menuEntrySchema>;
export type MenuInput = z.infer<typeof menuInputSchema>;
export interface MenuComponent {
  recipeId: string; portions: number; recipeName: string; recipeVersionId: string;
  recipeVersion: number; category: string; yieldPortions: number;
  ingredients: Array<{ productId: string; productName: string; unit: string; quantity: number }>;
}
export interface MenuEntry extends Omit<MenuEntryInput, "components"> { components: MenuComponent[]; }
export interface ServiceMenu {
  id: string | null; serviceDate: string; slot: ServiceSlot; revision: number;
  entries: MenuEntry[]; note: string; createdAt: string | null;
}
export const sheetInputSchema = z.object({
  operationId: z.uuid(), expectedRevision: z.number().int().nonnegative(),
  serviceDate: z.iso.date(), slot: slotSchema,
  action: z.enum(["save", "validate_plan", "close"]),
  forecastKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  planned: z.array(z.object({ recipeId: z.string().min(1).max(100),
    portions: z.number().int().min(0).max(10000) }).strict()).max(60),
  outcomes: z.array(z.object({ recipeId: z.string().min(1).max(100),
    retained: z.number().finite().min(0).max(10000).multipleOf(.001), discarded: z.number().finite().min(0).max(10000).multipleOf(.001),
    note: z.string().trim().max(500) }).strict()).max(60),
  substitutions: z.array(z.object({ fromRecipeId: z.string().min(1).max(100),
    toRecipeId: z.string().min(1).max(100), portions: z.number().int().positive().max(10000),
    note: z.string().trim().min(1).max(500) }).strict()).max(60),
  note: z.string().trim().max(2000),
}).strict().superRefine((input, ctx) => {
  for (const rows of [input.planned, input.outcomes]) if (new Set(rows.map(r => r.recipeId)).size !== rows.length)
    ctx.addIssue({ code: "custom", message: "Une ligne par recette est attendue." });
  if (input.substitutions.some(s => s.fromRecipeId === s.toRecipeId))
    ctx.addIssue({ code: "custom", message: "Une substitution doit changer de recette." });
});
export type SheetInput = z.infer<typeof sheetInputSchema>;
export const incidentInputSchema = z.object({
  operationId: z.uuid(), serviceDate: z.iso.date(), serviceSlot: slotSchema.nullable(),
  kind: z.enum(["delivery_delay", "unavailable", "lot_discarded", "stockout", "substitution", "demand_change"]),
  productId: z.string().min(1).max(100).nullable(), lotId: z.uuid().nullable(),
  orderLineId: z.uuid().nullable(), recipeId: z.string().min(1).max(100).nullable(),
  quantity: z.number().finite().positive().max(1_000_000).multipleOf(.001).nullable(),
  unit: z.string().min(1).max(20).nullable(), note: z.string().trim().min(1).max(2000),
}).strict();
export type IncidentInput = z.infer<typeof incidentInputSchema>;
