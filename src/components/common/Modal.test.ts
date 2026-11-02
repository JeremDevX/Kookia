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
