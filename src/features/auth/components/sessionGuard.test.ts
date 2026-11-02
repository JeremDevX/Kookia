import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../config/api";
import { sessionErrorStatus } from "../context/AuthContext";
import { RequireAuth } from "./RequireAuth";
import { PublicOnly } from "./PublicOnly";

vi.mock("../context/AuthContext", async (importOriginal) => ({
  ...await importOriginal<typeof import("../context/AuthContext")>(),
  useAuth: () => ({ status: "error", refreshUser: vi.fn() }),
}));

describe("session indisponible", () => {
  it("distingue une session absente des autres erreurs", () => {
    const error = (status: number) => new ApiError(status, { code: "ERROR", message: "Erreur" });
    expect(sessionErrorStatus(error(401))).toBe("unauthenticated");
    expect(sessionErrorStatus(error(500))).toBe("error");
    expect(sessionErrorStatus(new TypeError("réseau"))).toBe("error");
  });

  it.each([RequireAuth, PublicOnly])("bloque les pages et propose de réessayer", (Guard) => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/page"] },
      createElement(Routes, null, createElement(Route, { element: createElement(Guard) },
        createElement(Route, { path: "/page", element: createElement("p", null, "Contenu") })))));
    expect(html).toContain("Impossible de vérifier votre session");
    expect(html).toContain("Réessayer</button>");
    expect(html).not.toContain("Contenu");
  });
});
