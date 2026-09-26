import { describe, expect, it } from "vitest";
import { ingredientById, ingredients, quantity, recipeById } from "./catalog";
import { draw, menuFor, offsetDate } from "./calendar";
import { MAX_CHECKPOINT_BYTES, parseCheckpointFile, validateCheckpoint } from "./continuation";
import { available, grossDosages, take } from "./inventory";
import type { Checkpoint, Incident, Lot, Scenario } from "./model";
import { generateScenario } from "./scenario";
import { workshopOptions as input } from "./testFixtures";
import { getOrderStep, isOrderQuantity } from "../../shared/orderQuantity";

const sold = (s: Scenario) => s.days.reduce((n, d) => n + d.services.reduce((n, s) => n + s.runs.reduce((n, r) => n + r.sold, 0), 0), 0);
describe("chronological restaurant engine", () => {
  it.each<Incident | "mixed">(["normal", "short_delivery", "late_delivery", "unavailable", "high_waste", "refund", "stock_gap", "demand_shift", "mixed"])("conserves stock, prepared portions and transaction money for %s", incident => {
    const scenario = generateScenario({ ...input, days: 42, covers: 200, services: "both", incident });
    for (const [index, day] of scenario.days.entries()) {
      expect(day.card + day.cash).toBe(day.collected);
      expect(day.gross - day.discount - day.refunded).toBe(day.collected);
      expect(day.net + day.tax).toBe(day.collected);
      for (const line of day.stock) {
        expect(line.opening).toBe(index ? scenario.days[index - 1].stock.find(l => l.id === line.id)!.closing : 0);
        expect(quantity(line.opening + line.received - line.consumed - line.loss + line.adjustment)).toBe(line.closing);
        expect(line.closing).toBeGreaterThanOrEqual(0);
        expect(available(day.closingLots, line.id)).toBe(line.closing);
        const produced = day.services.flatMap(s => s.runs).reduce((sum, r) => sum + (grossDosages(recipeById(r.recipeId), input.lossPercent)[line.id] ?? 0) * r.prepared / 10, 0);
        expect(line.consumed).toBe(quantity(produced));
        expect(line.loss).toBe(quantity(day.waste.filter(w => w.stockEffect && w.productId === line.id).reduce((sum, w) => sum + w.quantity, 0)));
      }
      for (const service of day.services) {
        for (const r of service.runs) {
          expect(r.prepared).toBe(r.sold + r.unsold);
          expect(r.demand + r.substitutedIn).toBe(r.sold + r.substitutedOut + r.unserved);
          expect(r.plateReturns).toBeLessThanOrEqual(r.sold);
          expect(r.sold).toBe(service.transactions.flatMap(t => t.lines).filter(l => l.recipeId === r.recipeId).reduce((n, l) => n + l.quantity, 0));
        }
        for (const t of service.transactions) {
          expect(t.lines.reduce((n, l) => n + l.total, 0)).toBe(t.total);
          expect(t.net + t.tax).toBe(t.total);
          expect(t.refund).toBeLessThanOrEqual(t.total);
          expect(t.total - t.refund).toBeGreaterThanOrEqual(0);
        }
      }
      expect(day.closingLots.every(l => l.quantity > 0 && l.expiresOn >= day.date)).toBe(true);
    }
    for (const p of scenario.purchases) for (const line of p.lines) {
      expect(isOrderQuantity(line.ordered, getOrderStep(ingredientById(line.productId)))).toBe(true);
      if (p.receivedOn) expect(quantity(line.received + line.shortage)).toBe(line.ordered);
      else expect(line.received).toBe(0);
    }
    expect(validateCheckpoint(scenario.checkpoint)).toEqual(scenario.checkpoint);
  });
  it("keeps forecast, initial purchases and preparation independent of future demand", () => {
    const low = generateScenario({ ...input, days: 1, variationPercent: 0 });
    const high = generateScenario({ ...input, days: 1, variationPercent: 50, incident: "demand_shift" });
    const orders = (s: Scenario) => s.purchases.filter(p => p.placedOn < input.start).map(p => p.lines.map(l => [l.productId, l.ordered, l.unitPrice]));
    expect(orders(low)).toEqual(orders(high));
    expect(low.days[0].forecastCovers).toBe(high.days[0].forecastCovers);
    const initial = (s: Scenario) => s.days[0].services[0].runs.map(r => [r.recipeId, r.prepared - r.extraPrepared]);
    expect(initial(low)).toEqual(initial(high));
    expect(low.days[0].covers).not.toBe(high.days[0].covers);
    expect(low.days[0].services[0].runs.some(r => r.unsold > 0 || r.unserved > 0)).toBe(true);
  });
  it.each<Incident>(["short_delivery", "late_delivery", "unavailable", "high_waste"])("makes %s affect actual sales without emergency replenishment", incident => {
    const normal = generateScenario(input), affected = generateScenario({ ...input, incident });
    expect(sold(affected)).toBeLessThan(sold(normal));
    expect(affected.days.some(d => d.services.some(s => s.runs.some(r => r.unserved > 0)))).toBe(true);
    expect(affected.purchases.every(p => p.placedOn < p.deliveryOn)).toBe(true);
    expect(affected.days.some(d => d.events.length)).toBe(true);
  });
  it("does not receive a delayed order early and carries it past the period", () => {
    const s = generateScenario({ ...input, days: 1, incident: "late_delivery" });
    const delayed = s.checkpoint.pendingOrders.find(p => p.delayed)!;
    expect(delayed).toBeDefined(); expect(delayed.receivedOn).toBeNull();
    expect(s.days[0].stock.filter(l => ingredientById(l.id).supplier === delayed.supplierId).every(l => l.received === 0)).toBe(true);
    const next = generateScenario({ ...input, start: offsetDate(input.start, 1), days: 1, incident: "late_delivery" }, s.checkpoint);
    expect(next.purchases.find(p => p.id === delayed.id)?.receivedOn).toBe(next.days[0].date);
  });
  it("uses the earliest expiry first and preserves individual lot ages", () => {
    const lots: Lot[] = [
      { id: "old", productId: "pomme", quantity: 3, receivedOn: "2026-08-25", expiresOn: "2026-09-04", unitCost: 300 },
      { id: "urgent", productId: "pomme", quantity: 2, receivedOn: "2026-08-28", expiresOn: "2026-09-02", unitCost: 320 },
    ];
    expect(take(lots, "pomme", 2.5)).toEqual([{ lotId: "urgent", quantity: 2 }, { lotId: "old", quantity: .5 }]);
    expect(lots[0].quantity).toBe(2.5); expect(lots[0].expiresOn).toBe("2026-09-04");
    expect(() => take(lots, "pomme", 3)).toThrow("Stock insuffisant");
  });
  it("expires stock on closed days and never counts cooked waste twice", () => {
    const checkpoint: Checkpoint = { version: 2, catalogVersion: 2, asOf: "2026-09-06", originStart: "2026-09-01", seed: 1, dossier: "prior",
      lots: [{ id: "expired", productId: "poulet", quantity: 1, receivedOn: "2026-09-04", expiresOn: "2026-09-06", unitCost: 1200 }], pendingOrders: [] };
    const s = generateScenario({ ...input, start: "2026-09-07", days: 1 }, checkpoint);
    const line = s.days[0].stock.find(l => l.id === "poulet")!;
    expect(s.days[0].open).toBe(false); expect(line.loss).toBe(1); expect(line.consumed).toBe(0); expect(line.closing).toBe(0);
    const normal = generateScenario({ ...input, days: 90 });
    expect(new Set(normal.days.flatMap(d => d.waste.map(w => w.kind)))).toEqual(new Set(["preparation", "expiry", "unsold", "plate_return"]));
    expect(normal.days.flatMap(d => d.waste).filter(w => ["preparation", "unsold", "plate_return"].includes(w.kind)).every(w => !w.stockEffect)).toBe(true);
    expect(normal.days.some(d => d.waste.some(w => !w.avoidable))).toBe(true);
  });
  it("varies dates, seasons, menus, demand mix and transaction-derived payments", () => {
    const summer = generateScenario({ ...input, start: "2026-07-01", services: "both" });
    const winter = generateScenario({ ...input, start: "2026-12-01", services: "both" });
    expect(summer.days.map(d => d.covers)).not.toEqual(winter.days.map(d => d.covers));
    expect(summer.days.filter(d => !d.open).every(d => !d.services.length && d.collected === 0 && d.covers === 0)).toBe(true);
    expect(summer.days.find(d => d.open)!.services.map(s => s.name)).toEqual(["lunch", "dinner"]);
    const menu = menuFor("2026-12-01", "lunch", input);
    expect(menu.filter(r => r.category === "Plat")).toHaveLength(2);
    expect(menu.some(r => Object.hasOwn(r.ingredients, "tomate") || Object.hasOwn(r.ingredients, "courgette"))).toBe(false);
    expect(new Set(summer.days.filter(d => d.collected).map(d => (d.card / d.collected).toFixed(2))).size).toBeGreaterThan(5);
    const seasonPrices = generateScenario({ ...input, days: 90 }).purchases.flatMap(p => p.lines.filter(l => l.productId === "poulet").map(l => l.unitPrice));
    expect(new Set(seasonPrices).size).toBeGreaterThan(1);
    expect(generateScenario({ ...input, drinks: false, mealDeals: false }).days.every(d => d.discount === 0 && d.services.every(s => s.runs.every(r => r.recipeId !== "expresso")))).toBe(true);
  });
  it("applies refunds to existing items and produces signed count differences", () => {
    const normal = generateScenario(input), refunds = generateScenario({ ...input, incident: "refund" });
    expect(sold(refunds)).toBe(sold(normal));
    expect(refunds.days.map(d => d.stock)).toEqual(normal.days.map(d => d.stock));
    const refunded = refunds.days.flatMap(d => d.services.flatMap(s => s.transactions)).filter(t => t.refund);
    expect(new Set(refunded.map(t => t.refund)).size).toBeGreaterThan(1);
    expect(refunded.every(t => t.lines.some(l => l.recipeId === t.refundRecipeId))).toBe(true);
    expect(refunded.every(t => t.lines.some(l => l.recipeId === t.refundRecipeId && l.unitPrice - l.unitDiscount === t.refund))).toBe(true);
    const gaps = generateScenario({ ...input, incident: "stock_gap" }).days.flatMap(d => d.stock.map(l => l.adjustment));
    expect(gaps.some(n => n > 0)).toBe(true); expect(gaps.some(n => n < 0)).toBe(true);
  });
  it("replays identically, supports long date ranges and rejects impossible settings", () => {
    expect(generateScenario(input)).toEqual(generateScenario(input));
    expect(draw(1, "stable")).toBe(draw(1, "stable"));
    expect(generateScenario({ ...input, seed: 2 }).days).not.toEqual(generateScenario(input).days);
    expect(generateScenario({ ...input, start: "2010-01-01", days: 90 }).days).toHaveLength(90);
    expect(generateScenario({ ...input, start: "2030-12-29", days: 7 }).days.at(-1)?.date).toBe("2031-01-04");
    for (const change of [{ days: 91 }, { start: "2026-02-30" }, { start: "9999-12-31" }, { covers: 0 }, { closedWeekdays: [0, 1, 2, 3, 4, 5, 6] }, { closedWeekdays: [1, 1] }]) expect(() => generateScenario({ ...input, ...change })).toThrow();
    expect(ingredients.every(p => p.yield > 0 && p.yield <= 1)).toBe(true);
  });
});

describe("versioned local continuation", () => {
  it("matches one-block generation across weeks, seasons and pending deliveries", () => {
    const whole = generateScenario({ ...input, days: 90, incident: "mixed", services: "both" });
    const first = generateScenario({ ...input, days: 29, incident: "mixed", services: "both" });
    const restored = parseCheckpointFile(JSON.stringify(first));
    const next = generateScenario({ ...input, start: "2026-09-30", days: 61, incident: "mixed", services: "both" }, restored);
    expect(next.days).toEqual(whole.days.slice(29));
    expect(next.checkpoint.lots).toEqual(whole.checkpoint.lots);
    expect(next.checkpoint.pendingOrders).toEqual(whole.checkpoint.pendingOrders);
    expect(restored).toEqual(first.checkpoint);
    expect(() => generateScenario({ ...input, start: "2026-10-02" }, restored)).toThrow("juste après");
  });
  it("keeps a not-yet-opened restaurant resumable without future-issued orders", () => {
    const s = generateScenario({ ...input, start: "2026-09-21", days: 1, closedWeekdays: [1, 2, 3, 4, 5, 6] });
    expect(parseCheckpointFile(JSON.stringify(s.checkpoint))).toEqual(s.checkpoint);
    expect(s.checkpoint.pendingOrders.every(p => p.placedOn <= s.checkpoint.asOf)).toBe(true);
  });
  it("rejects legacy, invalid, unknown, duplicated and negative external state", () => {
    const state = generateScenario({ ...input, days: 7 }).checkpoint;
    expect(() => parseCheckpointFile("not json")).toThrow("illisible");
    expect(() => parseCheckpointFile(JSON.stringify({ options: input, days: [] }))).toThrow("version 2");
    for (const change of [{ version: 1 }, { lots: [{ ...state.lots[0], quantity: -1 }] }, { lots: [{ ...state.lots[0], productId: "external" }] },
      { lots: [state.lots[0], state.lots[0]] }, { lots: [{ ...state.lots[0], expiresOn: "2020-01-01" }] }, { pendingOrders: [{ id: "untrusted" }] },
      { pendingOrders: [{ ...state.pendingOrders[0], id: "BC-../../outside" }] }, { pendingOrders: [{ ...state.pendingOrders[0], receivedOn: "2026-09-01" }] }]) {
      expect(() => parseCheckpointFile(JSON.stringify({ ...state, ...change }))).toThrow("Reprise impossible");
    }
  });
  it("bounds an uploaded JSON before parsing it", () => {
    expect(() => parseCheckpointFile(" ".repeat(MAX_CHECKPOINT_BYTES + 1))).toThrow("trop volumineux");
  });
});
