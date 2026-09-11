import { apiRequest } from "../config/api";
export interface Report { from: string; to: string; timezone: string; generatedAt: string; rows: { section: string; date: string; metric: string; value: string | number; source: string }[]; }
export const getReport = (from: string, to: string) => apiRequest<Report>(`/workspace/report?${new URLSearchParams({ from, to })}`);
export const reportCells = (report: Report): (string | number)[][] => [
  ["Rapport opérationnel KookiA — ne constitue pas une attestation de conformité"],
  ["Du", report.from, "au", report.to, "Fuseau", report.timezone],
  ["Les instantanés de démonstration ne sont pas des mesures calculées sur la période sélectionnée."],
  ["Section", "Date", "Indicateur", "Valeur", "Source"],
  ...report.rows.map((row) => [row.section, row.date, row.metric, row.value, row.source]),
];
export function reportCsv(report: Report) {
  return "\uFEFF" + reportCells(report).map((row) => row.map((value) => {
    const text = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }).join(";")).join("\r\n");
}
const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
export function reportExcelXml(report: Report) {
  const rows = reportCells(report).map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${xml(String(value))}</Data></Cell>`).join("")}</Row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Rapport"><Table>${rows}</Table></Worksheet></Workbook>`;
}
