import type { InventorySession } from "../../services/inventorySessionService";

type Line = InventorySession["lines"][number];
type Conflict = Pick<Line, "reason"> & { quantity: number | null };
interface PriorCount { value: string; unit: string; reason: string; }

export interface InventoryDraft {
  session: InventorySession;
  values: Record<string, string>;
  dirty: boolean;
  conflicts: Record<string, Conflict>;
  prior: Record<string, PriorCount>;
}

export function toInventoryDraft(session: InventorySession): InventoryDraft {
  return {
    session,
    values: Object.fromEntries(session.lines.map((line) => [line.productId, line.countedQuantity?.toString() ?? ""])),
    dirty: false, conflicts: {}, prior: {},
  };
}

export const parseCount = (value = "") => value.trim() ? Number(value.replace(",", ".")) : null;

export function inventoryForSave(draft: InventoryDraft, validate: boolean): { session: InventorySession } | { error: string } {
  const lines = draft.session.lines.map((line) => ({ ...line, countedQuantity: parseCount(draft.values[line.productId]) }));
  if (lines.some(({ productId, countedQuantity }) => countedQuantity !== null &&
    (!Number.isFinite(countedQuantity) || countedQuantity < 0 || countedQuantity > 1000000 || !/^\d+(?:[.,]\d{1,3})?$/.test(draft.values[productId])))) {
    return { error: "Indiquez des quantités positives ou nulles, avec trois décimales au maximum." };
  }
  if (validate && lines.some((line) => line.countedQuantity !== null && line.countedQuantity !== line.theoreticalQuantity && !line.reason.trim())) {
    return { error: "Justifiez chaque écart avant validation." };
  }
  return { session: { ...draft.session, lines } };
}

export function reconcileInventoryDraft(draft: InventoryDraft, latest: InventorySession, compareSavedValues: boolean): InventoryDraft {
  const previousLines = new Map(draft.session.lines.map((line) => [line.productId, line]));
  const next = { ...toInventoryDraft(latest), dirty: draft.dirty, prior: { ...draft.prior } };
  const lines = latest.lines.map((line) => {
    const previous = previousLines.get(line.productId);
    if (!previous) return line;
    const value = draft.values[line.productId] ?? "";
    if (previous.stockRevision !== line.stockRevision || previous.unit !== line.unit || line.available === false) {
      const count = line.previousCount;
      if (value.trim() && (!count || count.quantity !== parseCount(value) || count.unit !== previous.unit || count.reason !== previous.reason)) {
        next.prior[line.productId] = { value, unit: previous.unit, reason: previous.reason };
      }
      return line;
    }
    next.values[line.productId] = value;
    if (compareSavedValues && (parseCount(value) !== line.countedQuantity || previous.reason !== line.reason)) {
      next.conflicts[line.productId] = { quantity: line.countedQuantity, reason: line.reason };
    }
    return { ...line, reason: previous.reason };
  });
  return { ...next, session: { ...latest, lines } };
}
