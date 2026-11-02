import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import More from "./More";

it("ouvre directement les recettes réalisables depuis Plus", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(More)));
  expect(html).toContain('href="/recipes?view=anti-waste"');
});
