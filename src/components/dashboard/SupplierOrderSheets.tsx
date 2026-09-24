import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../common/Button";
import type { PurchaseOrder } from "../../services/orderService";
import { groupOrderLinesBySupplier, type SupplierOrderSheet as SupplierSheet } from "../../features/orders/supplierOrderSheets";
import "./SupplierOrderSheets.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateLabel = (createdAt: string) => new Date(createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const sheetTotal = (sheet: SupplierSheet) => sheet.lines.reduce((sum, line) => sum + line.quantity * line.pricePerUnit, 0);

interface SupplierOrderSheetsProps { order: PurchaseOrder; }

export default function SupplierOrderSheets({ order }: SupplierOrderSheetsProps) {
  const sheets = groupOrderLinesBySupplier(order.lines);
  const [printTarget, setPrintTarget] = useState<SupplierSheet | null>(null);
  const [printMessage, setPrintMessage] = useState("");
  const afterPrint = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    document.body.classList.remove("printing-supplier-order-sheet");
    if (afterPrint.current) window.removeEventListener("afterprint", afterPrint.current);
  }, []);

  const print = (sheet: SupplierSheet) => {
    setPrintMessage("");
    document.body.classList.add("printing-supplier-order-sheet");
    const finish = () => {
      document.body.classList.remove("printing-supplier-order-sheet");
      afterPrint.current = null;
      setPrintTarget(null);
      setPrintMessage("Fiche locale uniquement : aucune transmission au fournisseur n’a été effectuée.");
    };
    afterPrint.current = finish;
    window.addEventListener("afterprint", finish, { once: true });
    setPrintTarget(sheet);
    window.requestAnimationFrame(() => window.print());
  };

  return <section className="supplier-order-sheets" aria-label="Fiches fournisseur">
    <h3>Fiches fournisseur</h3>
    <p>Une fiche distincte par fournisseur, basée sur les lignes figées de cette commande. L’impression ne transmet rien.</p>
    {sheets.map((sheet) => <article className="supplier-order-sheet-preview" key={sheet.supplierId}>
      <div><strong>{sheet.supplierName}</strong><span>{sheet.lines.length} article{sheet.lines.length > 1 ? "s" : ""} · {money.format(sheetTotal(sheet))} indicatifs</span></div>
      <Button type="button" variant="outline" size="sm" disabled={printTarget !== null}
        aria-label={`Imprimer la fiche fournisseur ${sheet.supplierName}`} onClick={() => print(sheet)}>
        Imprimer la fiche
      </Button>
    </article>)}
    {printMessage && <p className="supplier-order-sheet-status" role="status">{printMessage}</p>}
    {printTarget && createPortal(<div className="supplier-order-sheet-print-root">
      <article className="supplier-order-sheet-document">
        <header>
          <h1>Fiche de préparation fournisseur</h1>
          <p><strong>{printTarget.supplierName}</strong></p>
          <p>Commande {order.id} · validée le {dateLabel(order.createdAt)}</p>
          <p>Document local non envoyé — il ne modifie pas le statut de la commande.</p>
        </header>
        <table>
          <caption>Lignes destinées à {printTarget.supplierName}</caption>
          <thead><tr><th scope="col">Article</th><th scope="col">Quantité</th><th scope="col">Prix unitaire enregistré</th><th scope="col">Total indicatif</th></tr></thead>
          <tbody>{printTarget.lines.map((line) => <tr key={line.id}>
            <td>{line.productName}</td><td>{line.quantity} {line.unit}</td>
            <td>{money.format(line.pricePerUnit)}</td><td>{money.format(line.quantity * line.pricePerUnit)}</td>
          </tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={3}>Total indicatif</th><td>{money.format(sheetTotal(printTarget))}</td></tr></tfoot>
        </table>
        <p>Prix repris du snapshot de commande ; taxes et frais non calculés. Aucun email ni autre envoi n’a été effectué.</p>
      </article>
    </div>, document.body)}
  </section>;
}
