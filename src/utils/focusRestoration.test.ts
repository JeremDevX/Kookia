import { afterEach, expect, it, vi } from "vitest";
import { consumeFocusRestoreRequest } from "./focusRestoration";

afterEach(() => vi.unstubAllGlobals());

it("rétablit le focus une seule fois quand le bouton actif a disparu", () => {
  const body = {};
  vi.stubGlobal("document", { activeElement: body, body });
  const pending = { current: true };

  expect(consumeFocusRestoreRequest(pending)).toBe(true);
  expect(consumeFocusRestoreRequest(pending)).toBe(false);
});

it("respecte le nouveau focus et abandonne la restauration", () => {
  const body = {};
  const document = { activeElement: {}, body };
  vi.stubGlobal("document", document);
  const pending = { current: true };

  expect(consumeFocusRestoreRequest(pending)).toBe(false);
  document.activeElement = body;
  expect(consumeFocusRestoreRequest(pending)).toBe(false);
});
