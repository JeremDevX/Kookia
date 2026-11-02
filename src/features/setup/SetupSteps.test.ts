import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SetupSteps from "./SetupSteps";
import type { SetupStep } from "./setupApi";

vi.mock("../auth/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "a", displayName: "Propriétaire", email: "pro@example.test" }, refreshUser: vi.fn(), logout: vi.fn() }) }));
vi.mock("../../components/settings/SupplierSettings", () => ({ default: () => createElement("p", null, "Fournisseurs enregistrés") }));
const render = (step: SetupStep) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(SetupSteps, { initialProgress: { configured: true, step, revision: 1 } })));

describe("étapes de configuration", () => {
  it("présente uniquement le compte réel et précise que les invitations sont indisponibles", () => {
    const html = render("team");
    expect(html).toContain("Propriétaire");
    expect(html).toContain("Les invitations d’équipe ne sont pas encore disponibles.");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Continuer sans invitation");
  });
  it("ouvre les fournisseurs existants à la reprise", () => {
    const html = render("suppliers");
    expect(html).toContain("Fournisseurs enregistrés");
    expect(html).toContain("Étape 3 sur 4");
    expect(html).toContain("Retour");
  });
  it("attend les données enregistrées avant de permettre la fin", () => {
    const html = render("review");
    expect(html).toContain("Chargement des informations enregistrées");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Terminer la configuration<\/button>/);
  });
});
