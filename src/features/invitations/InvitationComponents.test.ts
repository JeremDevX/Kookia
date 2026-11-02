import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import InvitationAccept from "./InvitationAccept";
import InvitationManager from "./InvitationManager";

vi.mock("../auth/context/AuthContext", () => ({ useAuth: () => ({ status: "unauthenticated", user: null, login: vi.fn(), register: vi.fn(), logout: vi.fn(), refreshUser: vi.fn() }) }));
afterEach(() => vi.unstubAllGlobals());
describe("écrans d’invitation isolés", () => {
  it("propose une connexion sur place sans afficher le jeton", () => {
    const token = "a".repeat(64);
    vi.stubGlobal("window", { location: { hash: `#token=${token}` } });
    const html = renderToStaticMarkup(createElement(InvitationAccept));
    expect(html).toContain("Se connecter");
    expect(html).toContain("Créer un compte");
    expect(html).not.toContain(token);
  });
  it("prévient que le lien donne accès et doit être transmis manuellement", () => {
    const html = renderToStaticMarkup(createElement(InvitationManager));
    expect(html).toContain("à transmettre vous-même");
    expect(html).toContain("Toute personne possédant le lien peut accéder");
    expect(html).not.toContain("Invitation envoyée");
  });
});
