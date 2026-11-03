import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OpeningWeekdays from "./OpeningWeekdays";
import { formatOpeningWeekdays } from "./openingWeekdaysUtils";

describe("jours d’ouverture", () => {
  it("distingue les jours inconnus, aucun jour et les jours choisis", () => {
    expect(formatOpeningWeekdays(null)).toBe("Non renseignés");
    expect(formatOpeningWeekdays([])).toBe("Aucun jour ouvert");
    expect(formatOpeningWeekdays([0, 1])).toBe("Lundi, Dimanche");
    expect(renderToStaticMarkup(createElement(OpeningWeekdays, { value: null, onChange: () => {} }))).not.toContain("Lundi");
    expect(renderToStaticMarkup(createElement(OpeningWeekdays, { value: [], onChange: () => {} }))).toContain("Aucun jour ouvert sélectionné.");
  });
});
