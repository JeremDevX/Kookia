import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import SalesImport from "./SalesImport";
import { previewSalesImport } from "../../services/salesService";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, refs: [] as { current: unknown }[], refIndex: 0 }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
  }, useRef: (value: unknown) => {
    const index = hooks.refIndex++;
    return hooks.refs[index] ?? (hooks.refs[index] = { current: value });
  } };
});
vi.mock("../../services/salesService", () => ({ previewSalesImport: vi.fn() }));

const find = (node: unknown, predicate: (element: ReactElement<{ [key: string]: unknown }>) => boolean): ReactElement<{ [key: string]: unknown }> | undefined => {
  if (!node || typeof node !== "object" || !("props" in node)) return;
  const element = node as ReactElement<{ [key: string]: unknown }>;
  if (predicate(element)) return element;
  for (const child of [element.props.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
};

beforeEach(() => { hooks.values = []; hooks.index = 0; hooks.refs = []; hooks.refIndex = 0; vi.clearAllMocks(); });
it("arrête l’analyse précédente si le fichier choisi ensuite est trop volumineux", async () => {
  let finish!: (value: never) => void;
  vi.mocked(previewSalesImport).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const render = () => { hooks.index = 0; hooks.refIndex = 0; return SalesImport({ items: [], onImported: vi.fn(), onItemsCreated: vi.fn() }); };
  const choose = (file: unknown) => (find(render(), (el) => el.type === "input" && el.props.type === "file")!.props.onChange as (event: unknown) => void)({ target: { files: [file], value: "file.csv" } });
  choose({ size: 10, text: async () => "csv" });
  await vi.waitFor(() => expect(previewSalesImport).toHaveBeenCalledOnce());
  expect(find(render(), (el) => el.props.children === "Analyse du fichier…")).toBeDefined();
  choose({ size: 256_001 });
  expect(find(render(), (el) => el.props.children === "Analyse du fichier…")).toBeUndefined();
  expect(find(render(), (el) => el.props.children === "Le fichier CSV dépasse 256 Ko.")).toBeDefined();
  finish({} as never);
  await vi.waitFor(() => expect(find(render(), (el) => el.props.children === "Analyse du fichier…")).toBeUndefined());
});
