import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MemberManager from "./MemberManager";

describe("liste de l’équipe", () => {
  it("présente le propriétaire sans action de retrait", () => {
    const html = renderToStaticMarkup(createElement(MemberManager, { owner: { displayName: "Camille Exemple", email: "camille@example.test" } }));
    expect(html).toContain("Camille Exemple");
    expect(html).toContain("camille@example.test");
    expect(html).toContain("Propriétaire");
    expect(html).not.toContain("Retirer l’accès");
  });
  it("n’ajoute pas de propriétaire quand il est déjà présenté ailleurs", () => {
    expect(renderToStaticMarkup(createElement(MemberManager, {}))).not.toContain("Propriétaire");
  });
});
