import { Children, isValidElement, useEffect, useState, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecipeCsvImport from "./RecipeCsvImport";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
  useRef: vi.fn((value: unknown) => ({ current: value })),
  useEffect: vi.fn(),
}));
function fileInput(node: unknown): ReactElement<{ onChange: (event: unknown) => void }> | undefined {
  if (!isValidElement<{ type?: string; children?: unknown; onChange?: (event: unknown) => void }>(node)) return;
  if (node.type === "input" && node.props.type === "file") return node as ReactElement<{ onChange: (event: unknown) => void }>;
  for (const child of Children.toArray(node.props.children as never)) { const found = fileInput(child); if (found) return found; }
}
function dropZone(node: unknown): ReactElement<{ onDrop: (event: unknown) => void }> | undefined {
  if (!isValidElement<{ className?: string; children?: unknown; onDrop?: (event: unknown) => void }>(node)) return;
  if (node.props.className === "recipe-csv-drop") return node as ReactElement<{ onDrop: (event: unknown) => void }>;
  for (const child of Children.toArray(node.props.children as never)) { const found = dropZone(child); if (found) return found; }
}
const deferred = () => { let resolve!: (value: ArrayBuffer) => void; const promise = new Promise<ArrayBuffer>((done) => { resolve = done; }); return { promise, resolve }; };
const csv = (name: string) => new TextEncoder().encode(`Produit,Quantité,Unité\n${name},1,kg`).buffer;
beforeEach(() => vi.clearAllMocks());

describe("sélection CSV", () => {
  it("lit un fichier déposé avec les mêmes contrôles que le sélecteur", async () => {
    const tree = RecipeCsvImport({ products: [], onClose: vi.fn(), onApply: vi.fn() });
    const preventDefault = vi.fn();
    dropZone(tree)!.props.onDrop({ preventDefault, dataTransfer: { files: [{ name: "fiche.csv", size: 10, arrayBuffer: async () => csv("Tomate") }] } });
    await vi.waitFor(() => expect(vi.mocked(useState).mock.results[0].value[1]).toHaveBeenCalledWith(expect.objectContaining({ rows: [expect.objectContaining({ fields: ["Tomate", "1", "kg"] })] })));
    expect(preventDefault).toHaveBeenCalled();
  });
  it("ignore une lecture antérieure terminée après la nouvelle sélection", async () => {
    const old = deferred(), next = deferred();
    const tree = RecipeCsvImport({ products: [], onClose: vi.fn(), onApply: vi.fn() });
    const input = fileInput(tree)!;
    input.props.onChange({ target: { files: [{ size: 10, arrayBuffer: () => old.promise }] } });
    input.props.onChange({ target: { files: [{ size: 10, arrayBuffer: () => next.promise }] } });
    next.resolve(csv("Nouveau"));
    const setDocument = vi.mocked(useState).mock.results[0].value[1];
    await vi.waitFor(() => expect(setDocument).toHaveBeenCalledWith(expect.objectContaining({ rows: [expect.objectContaining({ fields: ["Nouveau", "1", "kg"] })] })));
    old.resolve(csv("Ancien"));
    await Promise.resolve(); await Promise.resolve();
    expect(setDocument).not.toHaveBeenCalledWith(expect.objectContaining({ rows: [expect.objectContaining({ fields: ["Ancien", "1", "kg"] })] }));
  });
  it("invalide le fichier précédent avant une nouvelle lecture même si elle échoue", async () => {
    const tree = RecipeCsvImport({ products: [], onClose: vi.fn(), onApply: vi.fn() });
    const setDocument = vi.mocked(useState).mock.results[0].value[1];
    const setError = vi.mocked(useState).mock.results[5].value[1];
    fileInput(tree)!.props.onChange({ target: { files: [{ size: 1, arrayBuffer: async () => new Uint8Array([0xff]).buffer }] } });
    expect(setDocument).toHaveBeenCalledWith(null);
    await vi.waitFor(() => expect(setError).toHaveBeenCalledWith("Le fichier doit être encodé en UTF-8."));
    expect(setDocument).not.toHaveBeenCalledWith(expect.objectContaining({ headers: expect.any(Array) }));
  });
  it("ne remplace pas le fichier chargé si le sélecteur est annulé", () => {
    const tree = RecipeCsvImport({ products: [], onClose: vi.fn(), onApply: vi.fn() });
    fileInput(tree)!.props.onChange({ target: { files: [] } });
    expect(vi.mocked(useState).mock.results[0].value[1]).not.toHaveBeenCalled();
  });
  it("ignore une lecture terminée après annulation", async () => {
    const pending = deferred();
    const onApply = vi.fn();
    const tree = RecipeCsvImport({ products: [], onClose: vi.fn(), onApply });
    const cleanup = vi.mocked(useEffect).mock.calls[1][0]();
    fileInput(tree)!.props.onChange({ target: { files: [{ size: 10, arrayBuffer: () => pending.promise }] } });
    if (typeof cleanup === "function") cleanup();
    pending.resolve(csv("Ancien"));
    await Promise.resolve(); await Promise.resolve();
    const setDocument = vi.mocked(useState).mock.results[0].value[1];
    expect(setDocument).not.toHaveBeenCalledWith(expect.objectContaining({ headers: expect.any(Array) }));
    expect(onApply).not.toHaveBeenCalled();
  });
});
