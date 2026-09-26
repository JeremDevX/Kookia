import type { Document } from "./documents";

export interface TextRun { x: number; y: number; text: string; size: number; bold: boolean; muted: boolean }
export interface Page { runs: TextRun[] }
const clean = (text: string) => text.replace(/[\u00a0\u202f]/g, " ").replace(/[–—]/g, "-").replace(/[’]/g, "'").replace(/œ/g, "oe");
// Conservative Helvetica widths keep long user-entered labels inside each column.
export function wrap(text: string, width: number, size: number): string[] {
  const limit = Math.max(1, Math.floor(width / (size * 0.62)));
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
  const pages: Page[] = [];
  let y = 42;
  let page: Page;
  const add = (text: string, x: number, top: number, size = 10, bold = false, muted = false) =>
    page.runs.push({ text: clean(text), x, y: top, size, bold, muted });
  const newPage = () => {
    page = { runs: [] }; pages.push(page); y = 42;
    add("MAISON / DOCUMENTS", 40, y, 9, true, true); y += 24;
    for (const line of wrap(doc.title, 515, 21)) { add(line, 40, y, 21, true); y += 27; }
    add(`${doc.date} · ${doc.id}`, 40, y, 8, false, true); y += 25;
  };
  const ensure = (height: number) => { if (y + height > 770) newPage(); };
  const paragraph = (text: string, size = 10, bold = false) => {
    for (const line of wrap(text, 515, size)) { ensure(size + 6); add(line, 40, y, size, bold); y += size + 6; }
    y += 6;
  };
  newPage();
  paragraph(`Émetteur : ${doc.issuer}`, 11, true);
  paragraph(`Destinataire : ${doc.recipient}`);
  for (const section of doc.sections) {
    ensure(65); paragraph(section.heading, 12, true);
    const count = section.columns.length;
    const widths = count === 2 ? [180, 335] : [Math.min(210, 515 * 0.36), ...Array<number>(count - 1).fill((515 - Math.min(210, 515 * 0.36)) / (count - 1))];
    const row = (cells: string[], header = false) => {
      const lines = cells.map((cell, index) => wrap(cell, widths[index] - 12, 9));
      const height = Math.max(...lines.map(cell => cell.length)) * 13 + 12;
      if (y + height > 770) {
        newPage();
        paragraph(section.heading + " (suite)", 12, true);
        if (!header) row(section.columns, true);
      }
      let x = 40;
      lines.forEach((cell, index) => {
        cell.forEach((line, lineIndex) => add(line, x, y + lineIndex * 13, 9, header, header));
        x += widths[index];
      });
      y += height;
    };
    row(section.columns, true);
    section.rows.forEach(cells => row(cells));
    y += 14;
  }
  for (const note of doc.notes) paragraph(note, 9);
  pages.forEach((p, index) => p.runs.push({ x: 40, y: 805, text: `Archives · ${doc.date}                                             ${index + 1} / ${pages.length}`, size: 8, bold: false, muted: true }));
  return pages;
}
