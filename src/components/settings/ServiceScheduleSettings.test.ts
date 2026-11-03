import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceScheduleSettings from "./ServiceScheduleSettings";
import { saveWeeklyService } from "../../services/serviceCalendarService";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as Array<() => void> }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value;
    }];
  },
  useRef: (value: unknown) => ({ current: value }),
  useId: () => "title",
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void) => { hooks.effects.push(effect); },
}));
vi.mock("../../services/serviceCalendarService", () => ({ getWeeklyServices: vi.fn(), saveWeeklyService: vi.fn() }));

type Node = ReactElement<{ children?: ReactNode; disabled?: boolean; value?: string; onChange?: (event: unknown) => void; onClick?: () => void; onSubmit?: (event: unknown) => void; role?: string }>;
function nodes(node: ReactNode): Node[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement(node)) return [];
  const element = node as Node;
  return [element, ...nodes(element.props.children)];
}
function render(onPendingChange = vi.fn()) {
  hooks.index = 0; hooks.effects = [];
  const tree = nodes(ServiceScheduleSettings({ onPendingChange }));
  hooks.effects[0]();
  return tree;
}

describe("ServiceScheduleSettings", () => {
  beforeEach(() => {
    hooks.values = [[{ weekday: 1, slot: "lunch", opensAt: "12:00", closesAt: "14:00", revision: 3 }], 1, "lunch", true, "12:00", "14:00", false, true, false, "", ""];
    vi.resetAllMocks();
  });

  it("bloque les sélecteurs après modification et restaure les horaires à l’annulation", () => {
    const pending = vi.fn();
    let tree = render(pending);
    expect(pending).toHaveBeenLastCalledWith(false);
    tree.find(node => node.type === "input")!.props.onChange!({ target: { value: "12:30" } });
    tree = render(pending);
    expect(tree.filter(node => node.type === "select").slice(0, 2).every(node => node.props.disabled)).toBe(true);
    expect(pending).toHaveBeenLastCalledWith(true);
    tree.find(node => node.props.children === "Annuler")!.props.onClick!();
    tree = render(pending);
    expect(tree.find(node => node.type === "input")!.props.value).toBe("12:00");
    expect(tree.filter(node => node.type === "select").slice(0, 2).every(node => !node.props.disabled)).toBe(true);
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it("conserve la saisie après un conflit d’enregistrement", async () => {
    vi.mocked(saveWeeklyService).mockRejectedValueOnce(new Error("Conflit de révision"));
    let tree = render();
    tree.find(node => node.type === "input")!.props.onChange!({ target: { value: "12:30" } });
    tree = render();
    tree.find(node => node.type === "form")!.props.onSubmit!({ preventDefault: () => {} });
    await vi.waitFor(() => expect(saveWeeklyService).toHaveBeenCalled());
    await Promise.resolve();
    tree = render();
    expect(tree.find(node => node.type === "input")!.props.value).toBe("12:30");
    expect(tree.find(node => node.props.role === "alert")!.props.children).toContain("Conflit de révision");
    expect(tree.filter(node => node.type === "select")[0].props.disabled).toBe(true);
  });

  it("signale une sauvegarde en cours même sans modification", () => {
    vi.mocked(saveWeeklyService).mockImplementationOnce(() => new Promise(() => {}));
    const pending = vi.fn();
    const tree = render(pending);
    tree.find(node => node.type === "form")!.props.onSubmit!({ preventDefault: () => {} });
    render(pending);
    expect(pending).toHaveBeenLastCalledWith(true);
  });

  it("ne signale pas le chargement initial comme une saisie en attente", () => {
    hooks.values[6] = true; hooks.values[7] = false;
    const pending = vi.fn();
    render(pending);
    expect(pending).toHaveBeenLastCalledWith(false);
  });
});
