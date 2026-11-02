import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceError } from "./catalogService.js";
import { CsvSyntaxError, splitCsv } from "../../../../shared/csv.js";

export interface CsvSaleRow {
  line: number;
  serviceDate: string;
  itemName: string;
  quantity: number;
  sourceQuantity: string;
  validServiceDate: boolean;
  validQuantity: boolean;
  error?: string;
}


export function parseSalesCsv(csv: string, today: string) {
  if (Buffer.byteLength(csv, "utf8") > 256_000) throw new WorkspaceError(400, "CSV_TOO_LARGE", "Le fichier CSV dépasse 256 Ko.");
  if (csv.includes("\uFFFD") || csv.includes("\0")) throw new WorkspaceError(400, "INVALID_CSV", "Le fichier doit être en UTF-8 valide.");
  let records: ReturnType<typeof splitCsv>;
  try { records = splitCsv(csv.replace(/^\uFEFF/, "")); }
  catch (error) { if (error instanceof CsvSyntaxError) throw new WorkspaceError(400, "INVALID_CSV", error.message); throw error; }
  if (records.length < 2 || records[0].fields.join(",") !== "service_date,item_name,quantity")
    throw new WorkspaceError(400, "INVALID_CSV", "En-tête attendu : service_date,item_name,quantity, suivi d’au moins une ligne.");
  if (records.length > 5001) throw new WorkspaceError(400, "CSV_TOO_LARGE", "Le fichier est limité à 5 000 lignes de ventes.");
  const rows: CsvSaleRow[] = records.slice(1).map(({ line, fields }) => {
    const [rawDate = "", rawName = "", rawQuantity = ""] = fields;
    const itemName = rawName.trim();
    const serviceDate = rawDate.trim();
    const quantity = Number(rawQuantity);
    const validServiceDate = z.iso.date().safeParse(serviceDate).success && serviceDate <= today;
    const validQuantity = /^[1-9]\d*$/.test(rawQuantity.trim()) && Number.isSafeInteger(quantity) && quantity <= 1_000_000;
    let error: string | undefined;
    if (fields.length !== 3) error = "Trois colonnes sont attendues.";
    else if (!validServiceDate) error = "Date de service invalide ou future.";
    else if (!itemName || itemName.length > 120) error = "Nom d’article manquant ou trop long.";
    else if (!validQuantity)
      error = "Quantité entière positive attendue (maximum 1 000 000).";
    return { line, serviceDate, itemName, quantity, sourceQuantity: rawQuantity.trim().slice(0, 32),
      validServiceDate, validQuantity, ...(error ? { error } : {}) };
  });
  return { hash: createHash("sha256").update(csv, "utf8").digest("hex"), rows };
}
