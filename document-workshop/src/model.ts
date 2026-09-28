import { z } from "zod";
import type { Ingredient, Recipe } from "./catalog";
import type { ScenarioWeather } from "./weather";

export const optionsSchema = z.object({
  name: z.string().trim().min(1).max(80), address: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80), email: z.email().max(120),
  start: z.iso.date(), days: z.number().int().min(1).max(90),
  covers: z.number().int().min(5).max(200), seed: z.number().int().min(1).max(999999),
  variationPercent: z.number().int().min(0).max(50), lossPercent: z.number().min(0).max(20),
  starterPercent: z.number().int().min(0).max(100), dessertPercent: z.number().int().min(0).max(100),
  incidentEvery: z.number().int().min(1).max(90),
  incident: z.enum(["normal", "short_delivery", "late_delivery", "unavailable", "high_waste", "refund", "stock_gap", "demand_shift", "mixed"]),
  closedWeekdays: z.array(z.number().int().min(0).max(6)).max(6).refine(v => new Set(v).size === v.length).default([1]),
  services: z.enum(["lunch", "dinner", "both"]).default("lunch"),
  drinks: z.boolean().default(true), mealDeals: z.boolean().default(true),
  hasTerrace: z.boolean().nullable().default(null),
  weather: z.enum(["none", "varied", "clear", "rain", "fog", "storm"]).default("none"),
}).strict();
export type Options = z.infer<typeof optionsSchema>;
export type OptionsInput = z.input<typeof optionsSchema>;
export type Incident = Exclude<Options["incident"], "mixed">;
export type ServiceName = "lunch" | "dinner";
export interface Lot { id: string; productId: string; receivedOn: string; expiresOn: string; quantity: number; unitCost: number }
export interface PurchaseLine { productId: string; ordered: number; received: number; shortage: number; unitPrice: number }
export interface Purchase {
  id: string; supplierId: string; placedOn: string; expectedOn: string; deliveryOn: string;
  receivedOn: string | null; invoiceOn: string | null; time: string; delayed: boolean;
  lines: PurchaseLine[]; note: string;
}
export interface Waste {
  kind: "preparation" | "expiry" | "spoilage" | "unsold" | "plate_return";
  productId?: string; recipeId?: string; lotId?: string; service?: ServiceName;
  quantity: number; unit: "kg" | "L" | "pcs" | "portions";
  avoidable: boolean; stockEffect: boolean; note: string;
}
export interface StockLine {
  id: string; opening: number; ordered: number; received: number; shortage: number;
  consumed: number; loss: number; adjustment: number; closing: number;
}
export interface RecipeRun {
  recipeId: string; forecast: number; planned: number; prepared: number; extraPrepared: number;
  demand: number; sold: number; unsold: number; unserved: number;
  substitutedIn: number; substitutedOut: number; plateReturns: number; price: number;
}
export interface Decision { time: string; recipeId?: string; kind: "prepare" | "top_up" | "refusal" | "substitute"; portions: number; reason: string }
export interface TransactionLine { recipeId: string; quantity: number; unitPrice: number; unitDiscount: number; discount: number; total: number }
export interface Transaction {
  id: string; service: ServiceName; table: number; time: string; covers: number;
  payment: "card" | "cash"; invoiceRequested: boolean; lines: TransactionLine[];
  gross: number; discount: number; total: number; net: number; tax: number;
  refund: number; refundNet: number; refundRecipeId?: string; refundReason?: string;
}
export interface Service {
  name: ServiceName; baselineCovers: number; forecastCovers: number; covers: number; runs: RecipeRun[];
  decisions: Decision[]; transactions: Transaction[];
}
export interface Day {
  date: string; open: boolean; incident: Incident; events: string[];
  baselineCovers: number; forecastCovers: number; weather: ScenarioWeather; covers: number; services: Service[]; stock: StockLine[];
  waste: Waste[]; closingLots: Lot[];
  gross: number; discount: number; refunded: number; collected: number;
  net: number; tax: number; card: number; cash: number;
}
export interface Checkpoint {
  version: 2; catalogVersion: 2; asOf: string; originStart: string; seed: number; dossier: string;
  lots: Lot[]; pendingOrders: Purchase[];
}
export interface Scenario {
  version: 2; options: Options; days: Day[]; purchases: Purchase[];
  catalog: { version: 2; ingredients: Ingredient[]; recipes: Recipe[] };
  opening: Checkpoint | null; checkpoint: Checkpoint;
}
