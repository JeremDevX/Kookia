import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OpeningWeekdays from "./OpeningWeekdays";
import { formatOpeningWeekdays } from "./openingWeekdaysUtils";

describe("jours d’ouverture", () => {
  it("distingue les jours inconnus, aucun jour et les jours choisis", () => {
    expect(formatOpeningWeekdays(null)).toBe("Non renseignés");
    expect(formatOpeningWeekdays([])).toBe("Aucun jour ouvert");
    expect(formatOpeningWeekdays([0, 1])).toBe("Lundi, Dimanche");
    expect(renderToStaticMarkup(createElement(OpeningWeekdays, { value: null, onChange: () => {} }))).toContain("Jours non renseignés");
    expect(renderToStaticMarkup(createElement(OpeningWeekdays, { value: null, onChange: () => {} }))).toContain('aria-label="Lundi"');
    expect(renderToStaticMarkup(createElement(OpeningWeekdays, { value: [], onChange: () => {} }))).toContain("Aucun jour ouvert sélectionné.");
  });
  it("renseigne le premier jour choisi sans confondre valeur inconnue et fermeture", () => {
    const onChange = vi.fn();
    const tree = OpeningWeekdays({ value: null, onChange });
    const options = tree.props.children[2];
    const monday = options.props.children[0].props.children[0];
    monday.props.onChange({ target: { checked: true } });
    expect(onChange).toHaveBeenCalledWith([1]);
  });
});
