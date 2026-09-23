import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceError } from "./catalogService.js";

export interface CsvSaleRow {
  line: number;
  serviceDate: string;
  itemName: string;
  quantity: number;
  error?: string;
}

function splitCsv(csv: string) {
  const records: { line: number; fields: string[] }[] = [];
  const text = csv.replace(/\r\n?/g, "\n");
  let fields: string[] = [], field = "", quoted = false, closed = false, line = 1, rowLine = 1;
  const finishField = () => { fields.push(field); field = ""; closed = false; };
  const finishRow = () => {
    finishField();
    if (fields.length !== 1 || fields[0].trim()) records.push({ line: rowLine, fields });
    fields = []; rowLine = line + 1;
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else { field += char; if (char === "\n") line++; }
    } else if (char === ",") finishField();
    else if (char === "\n") { finishRow(); line++; }
    else if (char === '"' && field === "" && !closed) quoted = true;
    else if (closed || char === '"') throw new WorkspaceError(400, "INVALID_CSV", `Syntaxe CSV invalide à la ligne ${line}.`);
    else field += char;
  }
  if (quoted) throw new WorkspaceError(400, "INVALID_CSV", "Champ CSV non fermé.");
  if (field || fields.length || closed) { finishField(); records.push({ line: rowLine, fields }); }
  return records;
}

export function parseSalesCsv(csv: string, today: string) {
  if (Buffer.byteLength(csv, "utf8") > 256_000) throw new WorkspaceError(400, "CSV_TOO_LARGE", "Le fichier CSV dépasse 256 Ko.");
  if (csv.includes("\uFFFD") || csv.includes("\0")) throw new WorkspaceError(400, "INVALID_CSV", "Le fichier doit être en UTF-8 valide.");
  const records = splitCsv(csv.replace(/^\uFEFF/, ""));
  if (records.length < 2 || records[0].fields.join(",") !== "service_date,item_name,quantity")
    throw new WorkspaceError(400, "INVALID_CSV", "En-tête attendu : service_date,item_name,quantity, suivi d’au moins une ligne.");
  if (records.length > 5001) throw new WorkspaceError(400, "CSV_TOO_LARGE", "Le fichier est limité à 5 000 lignes de ventes.");
  const rows: CsvSaleRow[] = records.slice(1).map(({ line, fields }) => {
    const [rawDate = "", rawName = "", rawQuantity = ""] = fields;
    const itemName = rawName.trim();
    const serviceDate = rawDate.trim();
    const quantity = Number(rawQuantity);
    let error: string | undefined;
    if (fields.length !== 3) error = "Trois colonnes sont attendues.";
    else if (!z.iso.date().safeParse(serviceDate).success || serviceDate > today) error = "Date de service invalide ou future.";
    else if (!itemName || itemName.length > 120) error = "Nom d’article manquant ou trop long.";
    else if (!/^[1-9]\d*$/.test(rawQuantity.trim()) || !Number.isSafeInteger(quantity) || quantity > 1_000_000)
      error = "Quantité entière positive attendue (maximum 1 000 000).";
    return { line, serviceDate, itemName, quantity, ...(error ? { error } : {}) };
  });
  return { hash: createHash("sha256").update(csv, "utf8").digest("hex"), rows };
}
