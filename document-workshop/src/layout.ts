import type { Document } from "./documents";

export type Color = [number, number, number];
export interface TextRun { x: number; y: number; text: string; size: number; bold: boolean; muted: boolean; font: "sans" | "mono" | "serif" }
export interface Rule { x: number; y: number; width: number; height: number; color: Color }
export interface Page { width: number; height: number; runs: TextRun[]; rules: Rule[]; accent: Color }
export const svgColor = (color: Color) => `rgb(${color.map(n => Math.round(n * 255)).join(",")})`;
const clean = (text: string) => text.replace(/[\u00a0\u202f]/g, " ").replace(/[–—]/g, "-").replace(/[’]/g, "'").replace(/œ/g, "oe");
export function wrap(text: string, width: number, size: number): string[] {
  const limit = Math.max(1, Math.floor(width / (size * .62)));
  const chunks = clean(text).split(/\s+/).flatMap(word => word.match(new RegExp(`.{1,${limit}}`, "gu")) ?? []);
  const lines: string[] = [];
  let line = "";
  for (const chunk of chunks) {
    if (line.length + chunk.length + 1 > limit && line) { lines.push(line); line = ""; }
    line += `${line ? " " : ""}${chunk}`;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
export function layoutDocument(doc: Document): Page[] {
  const receipt = doc.style === "receipt", margin = receipt ? 16 : 40;
  const width = receipt ? 280 : 595, height = 842, content = width - margin * 2;
  const font = receipt ? "mono" : doc.style === "farm" ? "serif" : "sans";
  const accent: Color = doc.style === "market" ? [.15, .37, .21] : doc.style === "farm" ? [.45, .20, .16]
    : doc.style === "wholesale" ? [.13, .27, .47] : receipt ? [.1, .1, .1] : [.18, .32, .24];
  const pages: Page[] = [];
  let y = 40, page: Page;
  const add = (text: string, x: number, top: number, size = 10, bold = false, muted = false) =>
    page.runs.push({ text: clean(text), x, y: top, size, bold, muted, font });
  const rule = (top: number, thickness = 1) => page.rules.push({ x: margin, y: top, width: content, height: thickness, color: accent });
  const newPage = () => {
    page = { width, height, runs: [], rules: [], accent }; pages.push(page); y = 38;
    if (!receipt) rule(18, doc.style === "wholesale" ? 9 : doc.style === "market" ? 4 : 1);
    const brand = doc.style === "house" ? "MAISON / DOCUMENTS" : doc.style === "receipt" ? doc.issuer.toUpperCase()
      : doc.style === "market" ? "LES JARDINS DU LEVANT / MARAÎCHER" : doc.style === "farm" ? "La Ferme des Aulnes" : "LE COMPTOIR DES GRAINS / NÉGOCE";
    for (const line of wrap(brand, content, receipt ? 10 : 9)) { add(line, margin, y, receipt ? 10 : 9, true, true); y += 14; }
    y += 12;
    const titleSize = receipt ? 16 : doc.style === "farm" ? 24 : 20;
    for (const line of wrap(doc.title, content, titleSize)) { add(line, margin, y, titleSize, true); y += titleSize + 5; }
    for (const line of wrap(`${doc.date} · ${doc.id}`, content, 8)) { add(line, margin, y, 8, false, true); y += 11; }
    if (receipt || doc.style === "farm") rule(y + 2);
    y += 22;
  };
  const ensure = (space: number) => { if (y + space > height - 64) newPage(); };
  const paragraph = (text: string, size = 10, bold = false) => {
    for (const line of wrap(text, content, size)) { ensure(size + 6); add(line, margin, y, size, bold); y += size + 6; }
    y += 6;
  };
  newPage();
  if (!receipt) { paragraph(`Émetteur : ${doc.issuer}`, 11, true); paragraph(`Destinataire : ${doc.recipient}`); }
  for (const section of doc.sections) {
    ensure(75); paragraph(section.heading, receipt ? 10 : 12, true);
    const count = section.columns.length;
    const first = content * (receipt ? .50 : count === 2 ? .38 : .34);
    const widths = [first, ...Array<number>(count - 1).fill((content - first) / (count - 1))];
    const row = (cells: string[], header = false) => {
      const size = receipt ? 8 : 9, lineHeight = receipt ? 11 : 13;
      const lines = cells.map((cell, index) => wrap(cell, widths[index] - 8, size));
      const rowHeight = Math.max(...lines.map(cell => cell.length)) * lineHeight + (receipt ? 8 : 12);
      if (y + rowHeight > height - 64) {
        newPage(); paragraph(section.heading + " (suite)", receipt ? 10 : 12, true);
        if (!header) row(section.columns, true);
      }
      let x = margin;
      lines.forEach((cell, index) => {
        cell.forEach((line, lineIndex) => add(line, x, y + lineIndex * lineHeight, size, header, header));
        x += widths[index];
      });
      y += rowHeight;
      if (header || doc.style === "wholesale") rule(y - 12, header ? .8 : .25);
    };
    row(section.columns, true);
    if (section.rows.length) section.rows.forEach(cells => row(cells));
    else paragraph("Aucune ligne.", 9);
    y += receipt ? 7 : 14;
  }
  for (const note of doc.notes) paragraph(note, receipt ? 8 : 9);
  pages.forEach((p, index) => p.runs.push({ x: margin, y: height - 30, text: `${doc.date} · ${index + 1} / ${pages.length}`, size: 8, bold: false, muted: true, font }));
  return pages;
}
