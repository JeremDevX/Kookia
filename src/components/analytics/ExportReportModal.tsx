import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { getReport, reportCells, reportCsv, reportExcelXml } from "../../services/reportService";
import { formatLocalISODate } from "../../utils/date";
import "./ExportReportModal.css";
interface ExportReportModalProps { isOpen: boolean; onClose: () => void; }
export default function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState(() => `${formatLocalISODate(new Date()).slice(0, 7)}-01`);
  const [to, setTo] = useState(() => formatLocalISODate(new Date()));
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
        const table = printWindow.document.createElement("table");
        table.style.cssText = "border-collapse:collapse;font:11px sans-serif;width:100%";
        for (const row of reportCells(report)) {
          const tr = table.insertRow();
          for (const value of row) { const td = tr.insertCell(); td.textContent = String(value); td.style.cssText = "border:1px solid #ccc;padding:5px;overflow-wrap:anywhere"; }
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
  return <Modal isOpen={isOpen} onClose={onClose} title="Exporter les données" width="md">
    <div className="export-report-modal flex flex-col gap-lg">
      <p>Rapport opérationnel, sans attestation de conformité. Les données de démonstration restent identifiées comme telles.</p>
      <p>Les opérations datées sont filtrées sur la période (UTC). Les anciens graphiques sans dates sont inclus comme instantané du 11/09/2026 si cette date est sélectionnée, sans recalcul sur la période.</p>
      <label htmlFor="report-format">Format</label>
      <select className="input-field" id="report-format" value={format} disabled={loading} onChange={(event) => setFormat(event.target.value)}>
        <option value="csv">CSV</option><option value="excel">Excel — classeur XML</option><option value="pdf">PDF — via impression</option>
      </select>
      <label htmlFor="report-from">Du (UTC)</label><input className="input-field" id="report-from" type="date" value={from} disabled={loading} onChange={(event) => setFrom(event.target.value)} />
      <label htmlFor="report-to">Au (UTC, inclus)</label><input className="input-field" id="report-to" type="date" value={to} disabled={loading} onChange={(event) => setTo(event.target.value)} />
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <div className="export-actions"><Button variant="outline" onClick={onClose} disabled={loading}>Fermer</Button><Button onClick={exportReport} disabled={loading || !from || !to || from > to}>{loading ? "Préparation…" : format === "pdf" ? "Préparer le PDF" : "Télécharger"}</Button></div>
    </div>
  </Modal>;
}
