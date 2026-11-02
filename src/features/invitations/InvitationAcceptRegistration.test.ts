import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import InvitationAccept from "./InvitationAccept";

vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  let stateIndex = 0;
  return {
    ...react,
    useState: (initial: unknown) => [stateIndex++ === 1 ? true : typeof initial === "function" ? initial() : initial, vi.fn()],
  };
});
vi.mock("../auth/context/AuthContext", () => ({ useAuth: () => ({ status: "unauthenticated", user: null }) }));

it("relie l’indication de longueur au mot de passe lors de la création du compte", () => {
  vi.stubGlobal("window", { location: { hash: `#token=${"a".repeat(64)}` } });
  try {
    const html = renderToStaticMarkup(createElement(InvitationAccept));
    expect(html).toMatch(/<input[^>]*id="invite-password"[^>]*aria-describedby="invite-password-help"/);
    expect(html).toContain('<small id="invite-password-help">10 caractères minimum.</small>');
  } finally {
    vi.unstubAllGlobals();
  }
});
