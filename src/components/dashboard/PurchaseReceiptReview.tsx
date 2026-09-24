import { useRef, useState } from "react";
import Button from "../common/Button";
import { getInvoices, type Invoice } from "../../services/invoiceService";
import { reconcilePurchaseReceipt, type PurchaseOrder, type PurchaseReceiptInput } from "../../services/orderService";
import "./PurchaseReceiptReview.css";

interface PurchaseReceiptReviewProps { order: PurchaseOrder; onSaved: () => void; }
interface ReceiptLineDraft { orderLineId: string; receivedQuantity: string; priceDifferenceReason: string; }

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const validQuantity = (value: string) => /^\d+(?:\.\d{1,3})?$/.test(value.trim()) &&
  Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1_000_000;
const equalPrice = (left: number, right: number) => Math.round(left * 10_000) === Math.round(right * 10_000);

export default function PurchaseReceiptReview({ order, onSaved }: PurchaseReceiptReviewProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [lines, setLines] = useState<Record<number, ReceiptLineDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const operation = useRef<{ signature: string; id: string } | null>(null);
  const invoice = invoices.find((candidate) => candidate.id === invoiceId);
  const demoOrder = order.status.startsWith("simulated");
  const eligibleInvoices = invoices.filter((candidate) => candidate.status === "draft" && !!candidate.supplierId &&
    (demoOrder || candidate.source === "manual") && order.lines.some((line) => line.supplierId === candidate.supplierId &&
      candidate.lines.some((invoiceLine) => invoiceLine.productId === line.productId && invoiceLine.unit === line.unit)));
  const includedLines = invoice?.lines.flatMap((line, index) => invoice.source === "source_document"
    ? line.disposition === "stock" ? [{ line, index }] : []
    : [{ line, index }]) ?? [];

  const loadInvoices = async () => {
    setLoading(true); setError("");
    try {
      const result = await getInvoices();
      setInvoices(result); setLoaded(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Factures indisponibles."); }
    finally { setLoading(false); }
  };

  const chooseInvoice = (id: string) => {
    const selected = invoices.find((candidate) => candidate.id === id);
    setInvoiceId(id); setError(""); setNotice(""); setDeliveryReference("");
    setDeliveryDate(selected?.date ?? parisToday());
    if (!selected) { setLines({}); return; }
    const nextLines: Record<number, ReceiptLineDraft> = {};
    selected.lines.forEach((invoiceLine, index) => {
      if (selected.source === "source_document" && invoiceLine.disposition !== "stock") return;
      const progress = selected.receiptProgress?.filter((entry) => entry.invoiceLineIndex === index) ?? [];
      const alreadyReceived = progress.reduce((sum, entry) => sum + entry.receivedQuantity, 0);
      const priorOrderLineId = progress.at(-1)?.orderLineId;
      const candidate = order.lines.find((orderLine) => orderLine.supplierId === selected.supplierId &&
        orderLine.productId === invoiceLine.productId && orderLine.unit === invoiceLine.unit &&
        (orderLine.remainingQuantity > 0 || orderLine.id === priorOrderLineId));
      const invoiceRemainder = Math.max(0, invoiceLine.quantity - alreadyReceived);
      const orderRemainder = candidate?.remainingQuantity ?? 0;
      nextLines[index] = { orderLineId: candidate?.id ?? "",
        receivedQuantity: String(Math.max(0, Math.min(invoiceRemainder, orderRemainder))), priceDifferenceReason: "" };
    });
    setLines(nextLines);
  };

  const updateLine = (index: number, change: Partial<ReceiptLineDraft>) => setLines((current) => ({
    ...current, [index]: { ...current[index], ...change },
  }));

  const payload = invoice && ({ invoiceDocumentId: invoice.id, invoiceDocumentRevision: invoice.revision,
    deliveryReference: deliveryReference.trim(), deliveryDate,
    lines: includedLines.map(({ index }) => ({ invoiceLineIndex: index, orderLineId: lines[index]?.orderLineId ?? "",
      receivedQuantity: Number(lines[index]?.receivedQuantity ?? "0"),
      ...(lines[index]?.priceDifferenceReason.trim() ? { priceDifferenceReason: lines[index].priceDifferenceReason.trim() } : {}),
    })),
  } satisfies Omit<PurchaseReceiptInput, "operationId">);

  const canSubmit = !!invoice && !!payload && deliveryReference.trim().length > 0 && !!deliveryDate &&
    includedLines.length > 0 && includedLines.every(({ line, index }) => {
      const draft = lines[index];
      const orderLine = order.lines.find((candidate) => candidate.id === draft?.orderLineId);
      const quantity = Number(draft?.receivedQuantity ?? "");
      const progress = invoice.receiptProgress?.filter((entry) => entry.invoiceLineIndex === index)
        .reduce((sum, entry) => sum + entry.receivedQuantity, 0) ?? 0;
      return !!draft?.orderLineId && !!orderLine && orderLine.supplierId === invoice.supplierId &&
        orderLine.productId === line.productId && orderLine.unit === line.unit && validQuantity(draft.receivedQuantity) &&
        quantity <= Math.min(Math.max(0, line.quantity - progress), orderLine.remainingQuantity) &&
        (equalPrice(line.unitPrice, orderLine.pricePerUnit) || draft.priceDifferenceReason.trim().length > 0);
    }) && new Set(includedLines.map(({ index }) => lines[index]?.orderLineId)).size === includedLines.length &&
    includedLines.some(({ index }) => Number(lines[index]?.receivedQuantity ?? 0) > 0) &&
    (invoice.source !== "source_document" || invoice.sourceTypeConfirmed === true && invoice.sourceDateConfirmed === true);

  const submit = async () => {
    if (!canSubmit || !invoice || !payload || saving) return;
    const signature = JSON.stringify(payload);
    if (!operation.current || operation.current.signature !== signature)
      operation.current = { signature, id: crypto.randomUUID() };
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await reconcilePurchaseReceipt(order.id, { ...payload, operationId: operation.current.id });
      setNotice(saved.simulated
        ? `Réception simulée enregistrée${saved.invoiceComplete ? "; facture rapprochée" : "; facture encore à compléter"}. Aucun stock réel n’a changé.`
        : `Réception enregistrée${saved.invoiceComplete ? "; facture rapprochée" : "; rapprochement partiel, facture conservée en brouillon"}.`);
      operation.current = null;
      await loadInvoices();
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Réception non enregistrée."); }
    finally { setSaving(false); }
  };

  return <details className="purchase-receipt-review" onToggle={(event) => {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    if (nextOpen && !loaded && !loading) void loadInvoices();
  }}>
    <summary>Rapprocher une facture et une livraison</summary>
    {open && <div className="purchase-receipt-form">
      {demoOrder && <p className="purchase-receipt-note">Espace de démonstration : cette réception restera simulée et ne modifiera pas le stock réel.</p>}
      {loading && <p role="status">Chargement des factures brouillon…</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!loading && eligibleInvoices.length === 0 && <p>Aucune facture brouillon avec fournisseur vérifié et lignes correspondant au reliquat de cette commande.</p>}
      {eligibleInvoices.length > 0 && <>
        <label htmlFor={`receipt-invoice-${order.id}`}>Facture revue</label>
        <select className="input-field" id={`receipt-invoice-${order.id}`} value={invoiceId} disabled={saving}
          onChange={(event) => chooseInvoice(event.target.value)}>
          <option value="">Choisir une facture</option>
          {eligibleInvoices.map((item) => <option key={item.id} value={item.id}>
            {item.reference} · {item.source === "source_document" ? "pièce de démonstration" :
              order.lines.find((line) => line.supplierId === item.supplierId)?.supplierName ?? item.sourceSupplier ?? "Fournisseur"} · {item.date || "date à compléter"}
          </option>)}
        </select>
      </>}
      {invoice && <>
        <label htmlFor={`receipt-delivery-reference-${order.id}`}>Référence du bon de livraison</label>
        <input className="input-field" id={`receipt-delivery-reference-${order.id}`} value={deliveryReference} disabled={saving}
          onChange={(event) => setDeliveryReference(event.target.value)} />
        <label htmlFor={`receipt-delivery-date-${order.id}`}>Date de livraison</label>
        <input className="input-field" id={`receipt-delivery-date-${order.id}`} type="date" value={deliveryDate} disabled={saving}
          onChange={(event) => setDeliveryDate(event.target.value)} />
        {invoice.source === "source_document" && <p>Pièce source simulée · type/date et chaque ligne doivent déjà avoir été vérifiés dans sa facture.</p>}
        {includedLines.map(({ line, index }) => {
          const draft = lines[index];
          const candidateLines = order.lines.filter((orderLine) => orderLine.supplierId === invoice.supplierId &&
            orderLine.productId === line.productId && orderLine.unit === line.unit &&
            (orderLine.remainingQuantity > 0 || orderLine.id === draft?.orderLineId));
          const matched = order.lines.find((orderLine) => orderLine.id === draft?.orderLineId);
          const priceDiffers = !!matched && !equalPrice(line.unitPrice, matched.pricePerUnit);
          const progress = invoice.receiptProgress?.filter((entry) => entry.invoiceLineIndex === index)
            .reduce((sum, entry) => sum + entry.receivedQuantity, 0) ?? 0;
          return <fieldset key={index} className="purchase-receipt-line" disabled={saving}>
            <legend>{line.sourceName ? `Pièce revue : ${line.sourceName}` : `Ligne de facture ${index + 1}`}</legend>
            <p>{line.productId ? order.lines.find((candidate) => candidate.productId === line.productId)?.productName ?? "Produit" : "Produit non associé"} · Facturé : {line.quantity} {line.unit ?? "unité"} × {line.unitPrice.toFixed(4)} €</p>
            {progress > 0 && <p>Déjà rapproché : {progress} {line.unit}.</p>}
            <label htmlFor={`receipt-order-line-${order.id}-${index}`}>Ligne de commande correspondante</label>
            <select className="input-field" id={`receipt-order-line-${order.id}-${index}`} value={draft?.orderLineId ?? ""}
              onChange={(event) => updateLine(index, { orderLineId: event.target.value })}>
              <option value="">Choisir une ligne</option>
              {candidateLines.map((orderLine) => <option key={orderLine.id} value={orderLine.id}>
                {orderLine.productName} · reste {orderLine.remainingQuantity} {orderLine.unit} · commande {orderLine.quantity} {orderLine.unit}
              </option>)}
            </select>
            {candidateLines.length === 0 && <p role="alert">Aucune ligne de commande restante avec ce produit, ce fournisseur et cette unité.</p>}
            <label htmlFor={`receipt-quantity-${order.id}-${index}`}>Quantité réellement livrée</label>
            <input className="input-field" id={`receipt-quantity-${order.id}-${index}`} type="number" min="0" step="0.001"
              value={draft?.receivedQuantity ?? "0"} onChange={(event) => updateLine(index, { receivedQuantity: event.target.value })} />
            <small>Saisissez 0 si cette ligne n’est pas arrivée. La quantité livrée ne peut pas dépasser la facture ni le reliquat de commande.</small>
            {priceDiffers && <>
              <p role="status">Écart de prix : commande {matched?.pricePerUnit.toFixed(4)} € · facture {line.unitPrice.toFixed(4)} €.</p>
              <label htmlFor={`receipt-price-reason-${order.id}-${index}`}>Motif vérifié de l’écart</label>
              <input className="input-field" id={`receipt-price-reason-${order.id}-${index}`} value={draft?.priceDifferenceReason ?? ""}
                onChange={(event) => updateLine(index, { priceDifferenceReason: event.target.value })} />
            </>}
          </fieldset>;
        })}
        {invoice.source === "source_document" && invoice.lines.some((line) => line.disposition === "pending") &&
          <p role="alert">Terminez d’abord la revue des lignes source dans la facture.</p>}
        <Button onClick={() => void submit()} disabled={!canSubmit || saving}>
          {saving ? "Enregistrement…" : demoOrder ? "Enregistrer la réception simulée" : "Rapprocher et ajouter au stock"}
        </Button>
      </>}
    </div>}
  </details>;
}
