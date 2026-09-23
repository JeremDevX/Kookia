import { createHash } from "node:crypto";
import type { SourceInvoice } from "./sourceInvoices.js";
import {
  convertSourceLine, type ConversionBasis, type StockUnit,
} from "./restaurantSimulationCatalog.js";

export interface InvoiceReceipt {
  invoiceId: string;
  invoiceFile: string;
  date: string;
  originalDate: string | null;
  supplier: string;
  productId: string;
  productKey: string;
  quantity: number;
  unit: StockUnit;
  pricePerUnit: number;
  sourceLines: Array<{
    lineNumber: number;
    name: string;
    sourceQuantityText: string;
    sourceQuantity: number;
    sourceUnit: StockUnit;
    sourceUnitPrice: number;
    sourcePriceBasis: string;
    receivedQuantity: number;
    receivedUnit: StockUnit;
    receivedPricePerUnit: number;
    conversionFactor: number;
    conversionBasis: ConversionBasis;
    sourcePriceTaxBasis: string;
    assumption?: string;
  }>;
}

const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

export function sourceInvoiceSupplierId(name: string) {
  return `invoice-supplier-${createHash("sha256").update(name.toLocaleLowerCase("fr")).digest("hex").slice(0, 24)}`;
}

export function makeReceiptGroups(invoices: SourceInvoice[], coverage: Map<string, Record<string, number>>) {
  const groups = new Map<string, InvoiceReceipt>();
  for (const invoice of invoices) {
    const year = invoice.date?.slice(0, 4) ?? "sans-date";
    const report = coverage.get(year)!;
    report.parsedLines = (report.parsedLines ?? 0) + invoice.stockLines.length;
    for (const line of invoice.stockLines) {
      const result = convertSourceLine(line, invoice.supplier);
      if (result.status === "excluded") {
        const field = result.reason === "outside_demo_menu" ? "outsideMenuLines" : "nonExploitableLines";
        report[field] = (report[field] ?? 0) + 1;
        continue;
      }
      const { product, quantity, pricePerUnit, factor, basis, assumption } = result.conversion;
      report.mappedLines = (report.mappedLines ?? 0) + 1;
      const taxField = line.priceTaxBasis === "HT" ? "priceTaxHTLines" : line.priceTaxBasis === "TTC" ? "priceTaxTTCLines" : "priceTaxUnknownLines";
      report[taxField] = (report[taxField] ?? 0) + 1;
      const coverageField = basis === "direct" ? "directLines" : basis === "explicit_package" ? "explicitPackageLines" : "estimatedLines";
      report[coverageField] = (report[coverageField] ?? 0) + 1;
      const key = `${invoice.id}:${product.key}`;
      const prior = groups.get(key);
      const sourceLine = {
        lineNumber: line.sourceLineNumber, name: line.name, sourceQuantityText: line.sourceQuantityText,
        sourceQuantity: line.quantity, sourceUnit: line.unit, sourceUnitPrice: line.unitPrice,
        sourcePriceBasis: line.priceBasis, sourcePriceTaxBasis: line.priceTaxBasis,
        receivedQuantity: quantity, receivedUnit: product.unit,
        receivedPricePerUnit: pricePerUnit, conversionFactor: factor, conversionBasis: basis,
        ...(assumption ? { assumption } : {}),
      };
      if (prior) {
        const newQuantity = round(prior.quantity + quantity);
        const previousCost = prior.sourceLines.reduce((sum, row) => sum + row.sourceQuantity * row.sourceUnitPrice, 0);
        prior.quantity = newQuantity;
        prior.pricePerUnit = round((previousCost + line.quantity * line.unitPrice) / newQuantity, 4);
        prior.sourceLines.push(sourceLine);
      } else {
        groups.set(key, { invoiceId: invoice.id, invoiceFile: invoice.file, date: invoice.date!,
          originalDate: invoice.originalDate, supplier: invoice.supplier, productId: product.id,
          productKey: product.key, quantity, unit: product.unit, pricePerUnit, sourceLines: [sourceLine] });
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.invoiceId.localeCompare(b.invoiceId) || a.productId.localeCompare(b.productId));
}
