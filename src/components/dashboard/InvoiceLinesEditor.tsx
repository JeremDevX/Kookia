import type { Ref } from "react";
import type { Invoice, InvoiceLine, SourceLineDisposition } from "../../../shared/invoice";
import type { Product } from "../../types";
import Button from "../common/Button";

interface InvoiceLinesEditorProps {
  invoice: Invoice;
  products: Product[];
  disabled: boolean;
  firstProductSelectRef: Ref<HTMLSelectElement>;
  onLinesChange: (lines: InvoiceLine[]) => void;
}

const exclusionLabels: Record<NonNullable<InvoiceLine["exclusionReason"]>, string> = {
  not_stock_item: "Hors stock",
  not_readable: "Ligne illisible ou incertaine",
  not_applicable: "Ne correspond pas à cette réception",
  other: "Autre motif",
};

export default function InvoiceLinesEditor({ invoice, products, disabled, firstProductSelectRef,
  onLinesChange }: InvoiceLinesEditorProps) {
  const sourceLinked = invoice.source === "source_document";
  const documentaryReview = sourceLinked && (invoice.status === "received"
    ? invoice.stockEffect !== "demo_simulation" : invoice.sourceReceiptStockEffect !== "demo_simulation");
  const received = invoice.status === "received";
  const updateLine = (index: number, change: Partial<InvoiceLine>) => {
    onLinesChange(invoice.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...change } : line));
  };

  return <>
    {invoice.lines.map((line, index) => <fieldset key={line.sourceLineNumber ?? index} disabled={disabled || received || line.disposition === "excluded"}
      className="flex flex-col gap-sm">
      <legend>{sourceLinked ? `Ligne source ${line.sourceLineNumber}` : `Ligne ${index + 1}`}</legend>
      {line.sourceLineNumber !== undefined && <p className="invoice-source-line">
        Transcription : {line.sourceName} · {line.sourceQuantityText} · {line.sourceUnitPrice?.toFixed(2) ?? "—"} € ({line.sourceTaxBasis ?? "base inconnue"}).
        Vérifiez le produit, l’unité et le prix avant inclusion.
      </p>}
      <label htmlFor={`invoice-product-${index}`}>Produit</label>
      <select ref={index === 0 ? firstProductSelectRef : undefined} className="input-field"
        id={`invoice-product-${index}`} value={line.productId}
        onChange={(event) => {
          const product = products.find((item) => item.id === event.target.value);
          const sameUnit = !!product && product.unit === line.sourceUnit;
          updateLine(index, { productId: event.target.value, unit: product?.unit ?? "",
            ...(sourceLinked ? { quantity: sameUnit ? line.sourceQuantity ?? 0 : 0,
              unitPrice: sameUnit ? line.sourceUnitPrice ?? 0 : 0, disposition: "pending" as const } : {}) });
        }}>
        <option value="">Choisir un produit</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}
      </select>
      <label htmlFor={`invoice-quantity-${index}`}>{documentaryReview ? "Quantité retenue" : "Quantité à ajouter"} ({products.find((product) => product.id === line.productId)?.unit || line.unit || "unité du produit"})</label>
      <input className="input-field" id={`invoice-quantity-${index}`} type="number" min="0" step="0.001"
        value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value), disposition: sourceLinked ? "pending" : line.disposition })} />
      <label htmlFor={`invoice-price-${index}`}>Prix unitaire indicatif (€)</label>
      <input className="input-field" id={`invoice-price-${index}`} type="number" min="0" step="0.0001"
        value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value), disposition: sourceLinked ? "pending" : line.disposition })} />
      {!sourceLinked && <Button variant="outline" onClick={() => onLinesChange(invoice.lines.filter((_, lineIndex) => lineIndex !== index))}>
        Retirer cette ligne
      </Button>}
    </fieldset>)}
    {sourceLinked && !received && invoice.lines.map((line, index) => line.sourceLineNumber === undefined ? null : <div className="invoice-line-decision" key={`decision-${line.sourceLineNumber}`}>
      <label htmlFor={`invoice-disposition-${index}`}>Décision pour la ligne {line.sourceLineNumber}</label>
      <select className="input-field" id={`invoice-disposition-${index}`} value={line.disposition ?? "pending"}
        disabled={disabled} onChange={(event) => updateLine(index, {
          disposition: event.target.value as SourceLineDisposition,
          ...(event.target.value === "excluded" ? {} : { exclusionReason: undefined }),
        })}>
        <option value="pending">À examiner</option>
        <option value="stock">{documentaryReview ? "Retenir pour le rapprochement" : "Inclure au stock du scénario"}</option>
        <option value="excluded">Écarter la ligne</option>
      </select>
      {line.disposition === "excluded" && <>
        <label htmlFor={`invoice-exclusion-${index}`}>Motif d’exclusion</label>
        <select className="input-field" id={`invoice-exclusion-${index}`} value={line.exclusionReason ?? ""}
          disabled={disabled} onChange={(event) => updateLine(index, { exclusionReason: event.target.value as InvoiceLine["exclusionReason"] })}>
          <option value="">Choisir un motif</option>
          {Object.entries(exclusionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </>}
    </div>)}
    {!sourceLinked && !received && <Button variant="outline" disabled={disabled || products.length === 0}
      onClick={() => onLinesChange([...invoice.lines, { productId: products[0].id, quantity: 1,
        unitPrice: products[0].pricePerUnit, unit: products[0].unit }])}>Ajouter une ligne</Button>}
  </>;
}
