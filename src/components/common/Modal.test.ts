import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("disables the close button while closing is blocked and restores it afterwards", () => {
    const render = (closeDisabled: boolean) => renderToStaticMarkup(createElement(Modal, {
      isOpen: true, onClose: () => {}, title: "Test", closeDisabled, children: "Contenu",
    }));
    expect(render(true)).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Fermer la modale"/);
    expect(render(false)).not.toMatch(/<button[^>]*disabled=/);
  });
});

it("keeps keyboard focus inside when a fieldset disables its controls", async () => {
  const { vi } = await import("vitest");
  const listeners = new Map<string, EventListener>();
  class Element {
    disabled: boolean;
    constructor(disabled = false) { this.disabled = disabled; }
    matches(selector: string) { return selector === ":disabled" && this.disabled; }
    getAttribute() { return null; }
    focus() { fakeDocument.activeElement = this; }
  }
  const first = new Element();
  const inheritedDisabled = new Element(true);
  const last = new Element();
  let candidates = [inheritedDisabled, first, last, inheritedDisabled];
  const modal = Object.assign(new Element(), {
    querySelectorAll: () => candidates,
    contains: (element: Element) => candidates.includes(element) || element === modal,
  });
  const fakeDocument = {
    activeElement: null as Element | null,
    body: { style: { overflow: "" } },
    addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  let cleanup: (() => void) | undefined;
  let refCount = 0;
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("HTMLElement", Element);
  vi.resetModules();
  vi.doMock("react", async (importOriginal) => ({
    ...await importOriginal<typeof import("react")>(),
    useRef: () => ({ current: refCount++ === 0 ? modal : null }),
    useId: () => "title",
    useEffectEvent: (callback: () => void) => callback,
    useLayoutEffect: (effect: () => () => void) => { cleanup = effect(); },
  }));
  try {
    const { default: TestModal } = await import("./Modal");
    TestModal({ isOpen: true, onClose: () => {}, title: "Test", children: null });
    const tab = (shiftKey = false) => {
      const event = { key: "Tab", shiftKey, preventDefault: vi.fn() };
      listeners.get("keydown")?.(event as unknown as Event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    };
    expect(fakeDocument.activeElement).toBe(first);
    tab(true);
    expect(fakeDocument.activeElement).toBe(last);
    tab();
    expect(fakeDocument.activeElement).toBe(first);
    candidates = [inheritedDisabled];
    tab();
    expect(fakeDocument.activeElement).toBe(modal);
    tab(true);
    expect(fakeDocument.activeElement).toBe(modal);
  } finally {
    cleanup?.();
    vi.doUnmock("react");
    vi.unstubAllGlobals();
    vi.resetModules();
  }
});
