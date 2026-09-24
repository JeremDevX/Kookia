import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { getReport, reportCells, reportCsv, reportExcelXml } from "../../services/reportService";
import { formatLocalISODate } from "../../utils/date";
import "./ExportReportModal.css";
interface ExportReportModalProps { isOpen: boolean; onClose: () => void; initialFrom?: string; initialTo?: string; }
export default function ExportReportModal({ isOpen, onClose, initialFrom, initialTo }: ExportReportModalProps) {
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState(() => initialFrom ?? `${formatLocalISODate(new Date()).slice(0, 7)}-01`);
  const [to, setTo] = useState(() => initialTo ?? formatLocalISODate(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const exportReport = async () => {
    if (loading) return;
    setError(""); setNotice("");
    const printWindow = format === "pdf" ? window.open("", "_blank") : null;
    if (format === "pdf" && !printWindow) { setError("Autorisez la fenêtre d’impression puis réessayez."); return; }
    setLoading(true);
    try {
      const report = await getReport(from, to);
      if (printWindow) {
        printWindow.document.title = "Rapport opérationnel KookiA";
        const heading = printWindow.document.createElement("h1"); heading.textContent = "Rapport opérationnel KookiA";
        printWindow.document.body.append(heading);
        const cells = reportCells(report);
        const headerIndex = cells.findIndex((row) => row[0] === "Section" && row[1] === "Date");
        if (headerIndex < 0) throw new Error("En-tête du rapport indisponible.");
        for (const row of cells.slice(0, headerIndex)) {
          const paragraph = printWindow.document.createElement("p");
          paragraph.textContent = row.join(" ");
          paragraph.style.cssText = "font:12px sans-serif";
          printWindow.document.body.append(paragraph);
        }
        const table = printWindow.document.createElement("table");
        table.style.cssText = "border-collapse:collapse;font:11px sans-serif;width:100%;table-layout:fixed";
        const header = table.createTHead().insertRow();
        for (const label of cells[headerIndex]) {
          const th = printWindow.document.createElement("th"); th.textContent = String(label);
          th.style.cssText = "border:1px solid #ccc;padding:5px;text-align:left;background:#f0f3ec"; header.append(th);
        }
        const body = table.createTBody();
        for (const row of cells.slice(headerIndex + 1)) {
          const tr = body.insertRow(); tr.style.breakInside = "avoid";
          for (const value of row) { const td = tr.insertCell(); td.textContent = String(value); td.style.cssText = "border:1px solid #ccc;padding:5px;overflow-wrap:anywhere;vertical-align:top"; }
        }
        printWindow.document.body.append(table); printWindow.document.close(); printWindow.focus(); printWindow.print();
        setNotice("Choisissez Enregistrer en PDF dans la fenêtre d’impression.");
      } else {
        const content = format === "excel" ? reportExcelXml(report) : reportCsv(report);
        const url = URL.createObjectURL(new Blob([content], { type: format === "excel" ? "application/xml;charset=utf-8" : "text/csv;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = `kookia-${from}-${to}.${format === "excel" ? "xml" : "csv"}`;
        document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(`Export préparé : ${report.rows.length} lignes. Téléchargement demandé au navigateur.`);
      }
    } catch (error) { printWindow?.close(); setError(error instanceof Error ? error.message : "Export impossible."); }
    finally { setLoading(false); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Exporter le bilan" width="md">
    <div className="export-report-modal flex flex-col gap-lg">
      <p>L’export distingue les pertes déclarées uniquement par des mouvements de stock négatifs au motif « perte ». Leur date est en UTC ; le coût n’est calculé qu’avec un prix snapshoté. Les pertes sans prix ou avec unité incompatible sont signalées. Ruptures et quantités invendues ne sont pas mesurées ; les scénarios de démonstration sont exclus.</p>
      <label htmlFor="report-format">Format</label>
      <select className="input-field" id="report-format" value={format} disabled={loading} onChange={(event) => setFormat(event.target.value)}>
        <option value="csv">Tableur CSV</option><option value="excel">Tableur compatible Excel</option><option value="pdf">Imprimer ou enregistrer en PDF</option>
      </select>
      <label htmlFor="report-from">Date de début</label><input className="input-field" id="report-from" type="date" value={from} disabled={loading} onChange={(event) => setFrom(event.target.value)} />
      <label htmlFor="report-to">Date de fin incluse</label><input className="input-field" id="report-to" type="date" value={to} disabled={loading} onChange={(event) => setTo(event.target.value)} />
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <div className="export-actions"><Button variant="outline" onClick={onClose} disabled={loading}>Fermer</Button><Button onClick={exportReport} disabled={loading || !from || !to || from > to}>{loading ? "Préparation…" : format === "pdf" ? "Préparer le PDF" : "Télécharger"}</Button></div>
    </div>
  </Modal>;
}
