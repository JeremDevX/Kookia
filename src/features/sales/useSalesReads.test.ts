import { beforeEach, expect, it, vi } from "vitest";
import { useSalesReads } from "./useSalesReads";

const hooks = vi.hoisted(() => ({
  cursor: 0, slots: new Map<number, unknown>(), effects: [] as Array<() => void>,
  sales: vi.fn(), items: vi.fn(), latest: vi.fn(),
}));
vi.mock("../../services/salesService", () => ({ getSales: hooks.sales, getSaleItems: hooks.items, getLatestService: hooks.latest }));
vi.mock("react", () => {
  const same = (left: unknown[], right: unknown[]) => left.every((value, index) => Object.is(value, right[index]));
  return {
    useState: (initial: unknown) => {
      const slot = hooks.cursor++;
      if (!hooks.slots.has(slot)) hooks.slots.set(slot, initial);
      return [hooks.slots.get(slot), (next: unknown) => hooks.slots.set(slot,
        typeof next === "function" ? next(hooks.slots.get(slot)) : next)];
    },
    useCallback: (callback: unknown, deps: unknown[]) => {
      const slot = hooks.cursor++;
      const previous = hooks.slots.get(slot) as { deps: unknown[]; callback: unknown } | undefined;
      if (previous && same(deps, previous.deps)) return previous.callback;
      hooks.slots.set(slot, { deps, callback });
      return callback;
    },
    useEffect: (effect: () => () => void, deps: unknown[]) => {
      const slot = hooks.cursor++;
      const previous = hooks.slots.get(slot) as { deps: unknown[]; cleanup: () => void } | undefined;
      if (previous && same(deps, previous.deps)) return;
      hooks.effects.push(() => {
        previous?.cleanup();
        hooks.slots.set(slot, { deps, cleanup: effect() });
      });
    },
  };
});

const firstDate = "2026-11-01";
const lastDate = "2026-11-17";
const SalesReads = (from: string, to: string) => useSalesReads(from, to);
const render = (from = firstDate, to = lastDate) => {
  hooks.cursor = 0;
  const reads = SalesReads(from, to);
  hooks.effects.splice(0).forEach((run) => run());
  return reads;
};

beforeEach(() => {
  vi.resetAllMocks();
  hooks.slots.clear();
  hooks.sales.mockResolvedValue([]);
  hooks.items.mockResolvedValue([]);
  hooks.latest.mockResolvedValue(null);
});

it("limite le changement de période à l’historique et ignore une réponse de la période précédente", async () => {
  let resolvePrevious: (value: unknown) => void = () => {};
  hooks.sales.mockReturnValueOnce(new Promise((resolve) => { resolvePrevious = resolve; }));
  hooks.sales.mockResolvedValueOnce([{ id: "sale-current" }]);
  render();
  expect(render(lastDate, lastDate).history.loading).toBe(true);
  await Promise.resolve();
  resolvePrevious([{ id: "sale-previous" }]);
  await Promise.resolve();
  expect(render(lastDate, lastDate).history.data).toEqual([{ id: "sale-current" }]);
  expect(hooks.sales.mock.calls).toEqual([[firstDate, lastDate], [lastDate, lastDate]]);
  expect(hooks.items).toHaveBeenCalledOnce();
  expect(hooks.latest).toHaveBeenCalledOnce();
});

it("isole les erreurs et relance uniquement la lecture demandée", async () => {
  hooks.latest.mockRejectedValueOnce(new Error("Dernier service indisponible"));
  hooks.items.mockResolvedValue([{ id: "dish-id", name: "Gratin" }]);
  hooks.sales.mockResolvedValue([{ id: "sale-id" }]);
  render();
  await Promise.resolve();
  const reads = render();
  expect(reads.items).toEqual([{ id: "dish-id", name: "Gratin" }]);
  expect(reads.history.data).toEqual([{ id: "sale-id" }]);
  expect(reads.latest.error).toBe("Dernier service indisponible");
  reads.latest.reload();
  render();
  await Promise.resolve();
  expect(render().latest.error).toBeUndefined();
  expect(hooks.latest).toHaveBeenCalledTimes(2);
  expect(hooks.items).toHaveBeenCalledOnce();
  expect(hooks.sales).toHaveBeenCalledOnce();
});

it("conserve un article créé pendant le chargement, sans doublon", async () => {
  const shared = { id: "dish", name: "Gratin" };
  hooks.items.mockResolvedValue([shared]);
  render().rememberItems([shared, { id: "local", name: "Soupe" }]);
  await Promise.resolve();
  expect(render().items).toEqual([shared, { id: "local", name: "Soupe" }]);
});
