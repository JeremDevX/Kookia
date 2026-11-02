import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Input from "./Input";

describe("Input", () => {
  it("preserves help and associates errors with the field", () => {
    const render = (error?: string, description?: string) => renderToStaticMarkup(createElement(Input, {
      id: "password", label: "Mot de passe", error, "aria-describedby": description,
    }));
    expect(render(undefined, "password-help")).toContain('aria-describedby="password-help"');
    expect(render("Erreur")).toContain('aria-describedby="password-error"');
    const html = render("Erreur", "password-help");
    expect(html).toContain('aria-describedby="password-help password-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="password-error">Erreur');
    expect(render()).not.toContain("aria-describedby");
  });
});
