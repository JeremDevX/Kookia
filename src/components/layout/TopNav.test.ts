import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TopNav from "./TopNav";

vi.mock("../../features/auth/context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("./WeatherNavButton", () => ({ default: () => null }));

describe("fil d’Ariane du tableau de bord", () => {
  it.each([
    ["/", "Vue d’ensemble"],
    ["/?view=planning", "Planning du jour"],
    ["/?view=inconnue", "Vue d’ensemble"],
    ["/history", "Chronologie"],
    ["/more", "Fonctions"],
  ])("indique la page courante pour %s", (url, label) => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] },
      createElement(TopNav, { onMenuClick: () => {}, isSidebarOpen: false, menuButtonRef: createRef<HTMLButtonElement>() })));
    expect(html).toContain(`aria-current="page">${label}</span>`);
  });
});
