import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import SalesTicketImport from "./SalesTicketImport";

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[], setters: [] as ReturnType<typeof vi.fn>[], block: undefined as unknown, effects: [] as Array<() => unknown>, blocker: { state: "unblocked" } as unknown }));
const api = vi.hoisted(() => ({ createTicketZCandidates: vi.fn(), deleteTicketZBatch: vi.fn(), getTicketZBatches: vi.fn(), uploadTicketZFile: vi.fn() }));
vi.mock("../../services/salesService", () => api);
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: () => { const i = state.index++; return [state.values[i], state.setters[i]]; },
  useEffect: (effect: () => unknown) => { state.effects.push(effect); }, useCallback: (fn: unknown) => fn, useRef: () => ({ current: null }),
}));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ hash: "" }), useBlocker: (fn: unknown) => { state.block = fn; return state.blocker; } }));

function find(node: unknown, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as never)) { const match = find(child, predicate); if (match) return match; }
}
const batch = { id: "ticket", status: "uploaded", mimeType: "application/pdf", byteSize: 10, contentHash: "abc", recordCount: 0, provenance: "recorded_sales" };
const render = (onCandidatesSaved = vi.fn().mockResolvedValue(undefined)) => SalesTicketImport({ onCandidatesSaved, onPreviewChanged: vi.fn() });
beforeEach(() => {
  state.index = 0; state.effects = []; state.blocker = { state: "unblocked" }; state.values = [[batch], batch, { contentHash: "abc", url: "blob:old", mimeType: "application/pdf" }, "", "2026-01-01", [{ itemLabel: "Soupe", quantity: 2 }], true, false, false, false, "", "", "", false];
  state.setters = state.values.map(() => vi.fn());
  vi.stubGlobal("window", { confirm: vi.fn(() => true), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:new"), revokeObjectURL: vi.fn() });
  api.uploadTicketZFile.mockReset(); api.deleteTicketZBatch.mockReset(); api.createTicketZCandidates.mockReset(); api.getTicketZBatches.mockResolvedValue([]);
});
it("conserve le brouillon si le nouveau fichier est invalide ou échoue", async () => {
  const tree = render();
  const input = find(tree, (e) => e.type === "input" && e.props.type === "file")!;
  const change = input.props.onChange as (e: unknown) => void;
  change({ target: { files: [{ size: 1, type: "text/plain" }], value: "" } });
  expect(state.setters[1]).not.toHaveBeenCalled();
  api.uploadTicketZFile.mockRejectedValue(new Error("Échec"));
  change({ target: { files: [{ size: 1, type: "application/pdf" }], value: "" } });
  await vi.waitFor(() => expect(state.setters[10]).toHaveBeenCalledWith("Échec"));
  expect(state.setters[1]).not.toHaveBeenCalled();
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:old");
});
it("protège le remplacement, la suppression et la sortie", () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  const tree = render();
  const file = find(tree, (e) => e.type === "input" && e.props.type === "file")!;
  (file.props.onChange as (e: unknown) => void)({ target: { files: [{ size: 1, type: "application/pdf" }], value: "" } });
  const remove = find(tree, (e) => e.props.children === "Supprimer ce brouillon")!;
  (remove.props.onClick as () => void)();
  expect(api.uploadTicketZFile).not.toHaveBeenCalled(); expect(api.deleteTicketZBatch).not.toHaveBeenCalled();
  const block = state.block as (location: unknown) => boolean;
  expect(block({ currentLocation: { pathname: "/sales" }, nextLocation: { pathname: "/stocks" } })).toBe(true);
  expect(block({ currentLocation: { pathname: "/sales" }, nextLocation: { pathname: "/sales" } })).toBe(false);
});
it("verrouille les champs pendant l’enregistrement", () => {
  state.values[9] = true;
  const tree = render();
  expect(find(tree, (e) => e.type === "fieldset" && e.props.disabled === true)).toBeDefined();
  expect(find(tree, (e) => e.props.children === "Supprimer ce brouillon")!.props.disabled).toBe(true);
});
it("indique un échec d’actualisation après une sauvegarde réussie", async () => {
  api.createTicketZCandidates.mockResolvedValue({ ...batch, status: "candidates" });
  const tree = render(vi.fn().mockRejectedValue(new Error("refresh")));
  const form = find(tree, (e) => e.type === "form")!;
  (form.props.onSubmit as (e: unknown) => void)({ preventDefault() {} });
  await vi.waitFor(() => expect(state.setters[10]).toHaveBeenCalledWith("Transcription enregistrée, mais les ventes n’ont pas pu être actualisées. Actualisez la page."));
  expect(state.setters[6]).toHaveBeenCalledWith(false);
});

it("avertit avant le rechargement avec une transcription non enregistrée", () => {
  render();
  state.effects[1]();
  const [eventName, warn] = vi.mocked(window.addEventListener).mock.calls[0];
  expect(eventName).toBe("beforeunload");
  const event = { preventDefault: vi.fn(), returnValue: undefined };
  (warn as (event: unknown) => void)(event);
  expect(event.preventDefault).toHaveBeenCalledOnce();
});

it("verrouille le brouillon pendant une suppression différée", async () => {
  let complete!: () => void;
  api.deleteTicketZBatch.mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
  let tree = render();
  (find(tree, (e) => e.props.children === "Supprimer ce brouillon")!.props.onClick as () => void)();
  expect(state.setters[13]).toHaveBeenCalledWith(true);
  expect(state.setters[1]).not.toHaveBeenCalled();
  state.index = 0; state.effects = []; state.values[13] = true;
  const reset = vi.fn(), proceed = vi.fn();
  state.blocker = { state: "blocked", reset, proceed };
  tree = render();
  expect(find(tree, (e) => e.type === "input" && e.props.type === "file")!.props.disabled).toBe(true);
  expect(find(tree, (e) => e.type === "fieldset" && e.props.disabled === true)).toBeDefined();
  expect(find(tree, (e) => e.props.children === "Supprimer ce brouillon")!.props.disabled).toBe(true);
  state.effects[0]();
  expect(reset).toHaveBeenCalledOnce(); expect(proceed).not.toHaveBeenCalled();
  expect(window.confirm).toHaveBeenCalledOnce();
  complete();
  await vi.waitFor(() => expect(state.setters[13]).toHaveBeenCalledWith(false));
});
it("refuse la navigation pendant l’enregistrement sans demander de confirmation", () => {
  state.values[9] = true;
  const reset = vi.fn(), proceed = vi.fn();
  state.blocker = { state: "blocked", reset, proceed };
  render(); state.effects[0]();
  expect(reset).toHaveBeenCalledOnce(); expect(proceed).not.toHaveBeenCalled();
  expect(window.confirm).not.toHaveBeenCalled();
});
