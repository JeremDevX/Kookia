import type { Document } from "./documentModel";
import { layoutDocument } from "./layout";

// PDF 1.4, embedded text via standard Helvetica/WinAnsi fonts. No server or remote service.
function pdfString(value: string) {
  return [...value].map(char => {
    const code = char === "€" ? 128 : char === "·" ? 183 : char.codePointAt(0)!;
    if (code > 255) return "?";
    if (code < 32 || code > 126) return `\\${code.toString(8).padStart(3, "0")}`;
    return /[\\()]/.test(char) ? `\\${char}` : char;
  }).join("");
}
export function pdfBytes(doc: Document): Uint8Array<ArrayBuffer> {
  const pages = layoutDocument(doc);
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>"];
  const pageIds: number[] = [];
  for (const page of pages) {
    const id = objects.length + 1;
    pageIds.push(id);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R /F5 7 0 R /F6 8 0 R >> >> /Contents ${id + 1} 0 R >>`);
    const rules = page.rules.map(rule => `${rule.color.join(" ")} rg ${rule.x} ${page.height - rule.y - rule.height} ${rule.width} ${rule.height} re f`);
    const stream = [...rules, ...page.runs.map(run => {
      const font = (run.font === "mono" ? 3 : run.font === "serif" ? 5 : 1) + Number(run.bold);
      return `BT /F${font} ${run.size} Tf ${run.muted ? page.accent.join(" ") : "0.08 0.10 0.09"} rg 1 0 0 1 ${run.x.toFixed(2)} ${(page.height - run.y).toFixed(2)} Tm (${pdfString(run.text)}) Tj ET`;
    })].join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(output.length); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}
export function download(bytes: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(bytes instanceof Blob ? bytes : new Blob([bytes], { type }));
  const link = window.document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
