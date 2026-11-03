import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ExportReportModal from "./ExportReportModal";

describe("export du bilan", () => {
  const render = (initialFrom: string, initialTo: string) => renderToStaticMarkup(createElement(ExportReportModal, {
    isOpen: true, onClose: () => {}, initialFrom, initialTo,
  }));

  it("explique les dates manquantes ou inversées", () => {
    const missing = render("", "2026-06-30");
    expect(missing).toContain('<p role="status">Indiquez les deux dates');
    expect(missing).toMatch(/<button[^>]*disabled[^>]*>Télécharger<\/button>/);

    const reversed = render("2026-07-01", "2026-06-30");
    expect(reversed).toContain('<p role="status">La date de fin doit être égale ou postérieure');
    expect(reversed).toMatch(/<button[^>]*disabled[^>]*>Télécharger<\/button>/);

    const sameDay = render("2026-06-30", "2026-06-30");
    expect(sameDay).not.toContain("La date de fin doit être égale ou postérieure");
    expect(sameDay).toMatch(/<button(?![^>]*disabled)[^>]*>Télécharger<\/button>/);
  });
});
