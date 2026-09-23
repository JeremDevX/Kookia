import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export interface SourceLine {
  name: string;
  quantity: number;
  unit: "kg" | "L" | "pcs";
  unitPrice: number;
  code?: string;
}

export interface SourceInvoice {
  id: string;
  file: string;
  contentHash: string;
  title: string;
  date: string | null;
  originalDate: string | null;
  supplier: string;
  type: "invoice" | "credit" | "delivery";
  status: string;
  content: string;
  stockLines: SourceLine[];
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const field = (content: string, name: string) => content.match(new RegExp(`^- ${name} : (.+)$`, "m"))?.[1]?.trim();
const decimal = (value: string) => {
  const match = value.replace(/\s/g, "").match(/^(\d+(?:[,.]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : null;
};

function quantity(value: string): { amount: number; unit: SourceLine["unit"] } | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(\d+(?:[,.]\d{1,3})?)(?:\s*(KG|KGS|kg|g|L|l|litres?|PCE|PCS|BTE|BRQ|CRT|SHT|unités?|pièces?|bouteilles?|sacs?|bidons?))?$/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!(amount > 0 && amount <= 1_000_000)) return null;
  const rawUnit = match[2]?.toLowerCase();
  if (rawUnit === "g") return { amount: amount / 1000, unit: "kg" };
  if (rawUnit === "kg" || rawUnit === "kgs") return { amount, unit: "kg" };
  if (rawUnit === "l" || rawUnit?.startsWith("litre")) return { amount, unit: "L" };
  return Number.isInteger(amount) ? { amount, unit: "pcs" } : null;
}

function stockLines(content: string): SourceLine[] {
  const lines = content.split("\n");
  const result: SourceLine[] = [];
  let columns: string[] = [];
  for (const line of lines) {
    if (!line.startsWith("|")) { columns = []; continue; }
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.some((cell) => /quantit[eé]|qt[eé]/i.test(cell)) && cells.some((cell) => /prix.*(?:unitaire|net)|prix ht/i.test(cell))) {
      columns = cells;
      continue;
    }
    if (!columns.length || cells.length !== columns.length || cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const nameIndex = columns.findIndex((column) => /d[eé]signation|produit|article|denr[eé]e|libell[eé]|vin/i.test(column));
    const quantityIndex = columns.findIndex((column) => /quantit[eé]|qt[eé]/i.test(column));
    const priceIndex = columns.findIndex((column) => /prix.*(?:unitaire|net)|prix ht/i.test(column));
    if (nameIndex < 0 || quantityIndex < 0 || priceIndex < 0) continue;
    const name = cells[nameIndex];
    const parsedQuantity = quantity(cells[quantityIndex]);
    const unitPrice = decimal(cells[priceIndex]);
    if (!name || !parsedQuantity || unitPrice === null || unitPrice < 0 || unitPrice > 1_000_000) continue;
    const amountIndex = columns.findIndex((column) => /montant ht/i.test(column));
    const amount = amountIndex >= 0 ? decimal(cells[amountIndex]) : null;
    if (amount !== null && Math.abs(parsedQuantity.amount * unitPrice - amount) > 0.03) continue;
    const codeIndex = columns.findIndex((column) => /code|r[eé]f[eé]rence/i.test(column));
    result.push({ name: name.slice(0, 120), quantity: parsedQuantity.amount, unit: parsedQuantity.unit,
      unitPrice, ...(codeIndex >= 0 && cells[codeIndex] !== "—" ? { code: cells[codeIndex] } : {}) });
  }
  return result;
}

export function parseSourceInvoice(file: string, content: string): SourceInvoice {
  const title = content.match(/^# (.+)$/m)?.[1];
  if (!title) throw new Error(`Titre absent : ${file}`);
  const date = field(content, "Date décalée de la pièce \\(démonstration\\)") ?? null;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Date invalide : ${file}`);
  const originalDate = content.match(/^- Date[^\n]*\(pièce d’origine\) : (\d{4}-\d{2}-\d{2})/m)?.[1] ?? null;
  const supplier = field(content, "Fournisseur") ?? title.split(" — ")[0];
  const typeText = `${title} ${field(content, "Type") ?? ""}`;
  const type = /avoir/i.test(typeText) ? "credit" : /bon de livraison/i.test(typeText) ? "delivery" : "invoice";
  return { id: hash(file).slice(0, 24), file, contentHash: hash(content), title, date, originalDate,
    supplier, type, status: field(content, "Statut") ?? "À vérifier sur la pièce d’origine", content,
    stockLines: type === "invoice" && date ? stockLines(content) : [] };
}

export function readSourceInvoices(root = "données restaurants/factures"): SourceInvoice[] {
  const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : entry.name.endsWith(".md") ? [path] : [];
  });
  return files(root).sort().map((path) => parseSourceInvoice(relative(".", path), readFileSync(path, "utf8")));
}
