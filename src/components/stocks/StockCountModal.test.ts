import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { Product } from "../../types";
import StockCountModal from "./StockCountModal";
import Input from "../common/Input";
import Button from "../common/Button";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, refs: [] as { current: unknown }[], refIndex: 0 }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  }, useRef: (value: unknown) => {
    const index = hooks.refIndex++;
    return hooks.refs[index] ?? (hooks.refs[index] = { current: value });
  }, useEffect: () => {}, useEffectEvent: (fn: unknown) => fn };
});

const product = { id: "p1", name: "Tomates", currentStock: 10, unit: "kg", stockRevision: 1 } as Product;
const find = (node: ReactElement, type: unknown, text?: string): ReactElement<{ children?: unknown; [key: string]: unknown }> | undefined => {
  if (!node || typeof node !== "object" || !("props" in node)) return;
  const element = node as ReactElement<{ children?: unknown; [key: string]: unknown }>;
  if (element.type === type && (text === undefined || element.props.children === text)) return element;
  for (const child of [element.props.children].flat(Infinity)) {
    const match = find(child as ReactElement, type, text);
    if (match) return match;
  }
};

beforeEach(() => { hooks.values = []; hooks.index = 0; hooks.refs = []; hooks.refIndex = 0; });
it("conserve la saisie si le rechargement échoue, puis bloque les actions jusqu’au succès", async () => {
  let complete!: (success: boolean) => void;
  const onRefresh = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(() => new Promise<boolean>((resolve) => { complete = resolve; }));
  const onClose = vi.fn();
  const props = { product, isOpen: true, onClose, onRefresh, onSave: vi.fn().mockRejectedValue(new Error("Stock modifié")) };
  const render = () => { hooks.index = 0; hooks.refIndex = 0; return StockCountModal(props); };
  let tree = render();
  (find(tree, Input)!.props.onChange as (event: unknown) => void)({ target: { value: "7" } });
  tree = render();
  (find(tree, "form")!.props.onSubmit as (event: unknown) => void)({ preventDefault() {} });
  await vi.waitFor(() => expect(props.onSave).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(find(render(), Button, "Recharger la fiche")).toBeDefined());
  tree = render();
  (find(tree, Button, "Recharger la fiche")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(hooks.refs[0].current).toBe(false));
  tree = render();
  expect(find(tree, Input)!.props.value).toBe("7");
  expect(onClose).not.toHaveBeenCalled();
  (find(tree, Button, "Recharger la fiche")!.props.onClick as () => void)();
  tree = render();
  expect(tree.props.closeDisabled).toBe(true);
  expect(find(tree, Input)!.props.disabled).toBe(true);
  (find(tree, Button, "Recharger la fiche")!.props.onClick as () => void)();
  expect(onRefresh).toHaveBeenCalledTimes(2);
  complete(true);
  await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
});
