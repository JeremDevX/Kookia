import { splitCsv } from "../../../shared/csv";
import type { Product } from "../../types";

export interface CsvDocument { headers: string[]; rows: Array<{ line: number; fields: string[] }>; }
export interface ImportRow { line: number; source: string; productId: string; quantity: string; unit: string; }
export interface ImportedIngredient { productId: string; quantity: number; }

export async function readRecipeCsvFile(file: Pick<File, "size" | "arrayBuffer">): Promise<CsvDocument> {
  if (file.size > 256_000) throw new Error("Le fichier CSV dépasse 256 Ko.");
  const bytes = await file.arrayBuffer();
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("Le fichier doit être encodé en UTF-8."); }
  return parseRecipeCsv(text);
}

export function parseRecipeCsv(input: string): CsvDocument {
  if (input.includes("\uFFFD") || input.includes("\0")) throw new Error("Le fichier doit être encodé en UTF-8.");
  const text = input.replace(/^\uFEFF/, "");
  let quoted = false, commas = 0, semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"' && quoted && text[i + 1] === '"') { i++; continue; }
    if (text[i] === '"') quoted = !quoted;
    else if (!quoted && (text[i] === "\n" || text[i] === "\r")) break;
    else if (!quoted && text[i] === ",") commas++;
    else if (!quoted && text[i] === ";") semicolons++;
  }
  if (commas === semicolons) throw new Error("Séparateur CSV indéterminé. Utilisez des virgules ou des points-virgules.");
  const records = splitCsv(text, semicolons > commas ? ";" : ",");
  if (records.length < 2) throw new Error("Le fichier doit contenir un en-tête et au moins un ingrédient.");
  if (records.length > 101) throw new Error("Une fiche est limitée à 100 ingrédients.");
  const headers = records[0].fields.map((header) => header.trim());
  if (headers.some((header) => !header) || new Set(headers.map((header) => header.toLocaleLowerCase("fr"))).size !== headers.length)
    throw new Error("Les noms de colonnes doivent être renseignés et distincts.");
  if (records.slice(1).some((row) => row.fields.length !== headers.length)) throw new Error("Chaque ligne doit comporter le même nombre de colonnes que l’en-tête.");
  return { headers, rows: records.slice(1) };
}

export function mapRecipeColumns(document: CsvDocument, columns: { product: number; quantity: number; unit: number }): ImportRow[] {
  const selected = [columns.product, columns.quantity, columns.unit];
  if (new Set(selected).size !== 3 || selected.some((index) => !Number.isInteger(index) || index < 0 || index >= document.headers.length))
    throw new Error("Choisissez trois colonnes différentes.");
  return document.rows.map(({ line, fields }) => ({ line, source: fields[columns.product].trim(), productId: "", quantity: fields[columns.quantity].trim(), unit: fields[columns.unit].trim() }));
}

export function validateImportRows(rows: ImportRow[], products: Product[]): { ingredients: ImportedIngredient[]; errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<string>();
  const ingredients: ImportedIngredient[] = [];
  for (const row of rows) {
    const product = products.find((item) => item.id === row.productId);
    const value = row.quantity.trim();
    const quantity = Number(value.replace(",", "."));
    if (!row.source) errors.push(`Ligne ${row.line} : nom du produit manquant.`);
    if (!product) errors.push(`Ligne ${row.line} : choisissez un produit du catalogue.`);
    else {
      if (seen.has(product.id)) errors.push(`Ligne ${row.line} : ce produit est déjà associé à une autre ligne.`);
      seen.add(product.id);
      if (row.unit.trim() !== product.unit) errors.push(`Ligne ${row.line} : l’unité doit être ${product.unit}.`);
      if (product.unit === "pcs" && !Number.isInteger(quantity)) errors.push(`Ligne ${row.line} : la quantité en pièces doit être entière.`);
    }
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(value) || !Number.isFinite(quantity) || quantity < 0.001 || quantity > 1_000_000)
      errors.push(`Ligne ${row.line} : indiquez une quantité positive avec trois décimales au maximum.`);
    if (product) ingredients.push({ productId: product.id, quantity });
  }
  return { ingredients, errors };
}
