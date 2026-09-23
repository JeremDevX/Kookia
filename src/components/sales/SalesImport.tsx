import { useRef, useState, type ChangeEvent } from "react";
import Button from "../common/Button";
import { commitSalesImport, previewSalesImport, type SaleItem, type SalesImportPreview } from "../../services/salesService";

const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : "Réessayez.";
const statusLabel = { ready: "Prête", invalid: "Invalide", unmapped: "Sans correspondance", duplicate: "Doublon dans le fichier", existing: "Vente déjà enregistrée" };

export default function SalesImport({ items, onImported }: { items: SaleItem[]; onImported: (date: string) => Promise<void> }) {
  const [csv, setCsv] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<SalesImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const sequence = useRef(0);

  const inspect = async (content: string, nextMapping: Record<string, string>) => {
    const current = ++sequence.current;
    setLoading(true); setError(""); setStatus(""); setPreview(null);
    try {
      const result = await previewSalesImport(content, nextMapping);
      if (sequence.current === current) setPreview(result);
    } catch (cause) { if (sequence.current === current) setError(errorMessage(cause)); }
    finally { if (sequence.current === current) setLoading(false); }
  };
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const selection = ++sequence.current;
    setPreview(null); setCsv(""); setMapping({}); setError(""); setStatus(""); setPage(0);
    if (file.size > 256_000) { setError("Le fichier CSV dépasse 256 Ko."); return; }
    try {
      const content = await file.text();
      if (selection !== sequence.current) return;
      setCsv(content);
      await inspect(content, {});
    } catch (cause) { if (selection === sequence.current) setError(errorMessage(cause)); }
  };
  const chooseMapping = (name: string, id: string) => {
    if (committing) return;
    const next = { ...mapping };
    if (id) next[name] = id;
    else delete next[name];
    setMapping(next);
    void inspect(csv, next);
  };
  const commit = async () => {
    if (!preview || !preview.readyCount || preview.alreadyImported) return;
    const current = sequence.current;
    setCommitting(true); setError(""); setStatus("");
    try {
      const result = await commitSalesImport(csv, mapping, preview.hash);
      if (current === sequence.current) {
        setStatus(result.alreadyImported
          ? "Ce fichier a déjà été importé ; aucune vente ajoutée."
          : `${result.acceptedCount} vente(s) importée(s), ${result.rejectedCount} ligne(s) rejetée(s).`);
        setPreview({ ...preview, alreadyImported: true });
      }
      const latestDate = preview.rows.filter((row) => row.status === "ready")
        .map((row) => row.serviceDate).sort().at(-1);
      if (latestDate) await onImported(latestDate);
    } catch (cause) { if (current === sequence.current) setError(errorMessage(cause)); }
    finally { setCommitting(false); }
  };

  const pageSize = 50;
  const pageCount = preview ? Math.ceil(preview.rows.length / pageSize) : 0;
  const visibleRows = preview?.rows.slice(page * pageSize, (page + 1) * pageSize) ?? [];

  return <section className="sales-panel" aria-labelledby="sales-import-title">
    <h2 id="sales-import-title">Importer un CSV Kookia</h2>
    <p>Format UTF-8, virgules, en-tête <code>service_date,item_name,quantity</code>. Date au format AAAA-MM-JJ ; quantité entière positive. Maximum 5 000 lignes et 256 Ko. Les noms d’articles sont associés au catalogue ci-dessus.</p>
    <label className="sales-file-label">Fichier CSV<input type="file" accept=".csv,text/csv" disabled={committing} onChange={(event) => void selectFile(event)} /></label>
    {loading && <p role="status">Analyse du fichier…</p>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {preview && <>
      <p role="status">{preview.alreadyImported ? "Fichier déjà importé. " : ""}{preview.readyCount} ligne(s) prête(s), {preview.rejectedCount} rejetée(s). Les lignes rejetées ne seront pas enregistrées.</p>
      {pageCount > 1 && <div className="sales-actions"><Button type="button" variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Page précédente</Button>
        <span role="status">Page {page + 1} sur {pageCount}</span>
        <Button type="button" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>Page suivante</Button></div>}
      <div className="sales-table-wrap" role="region" aria-label="Aperçu des lignes CSV" tabIndex={0}>
        <table className="sales-table"><thead><tr><th>Ligne</th><th>Date</th><th>Article du fichier</th><th>Quantité</th><th>Correspondance</th><th>État</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.line}>
            <td>{row.line}</td><td>{row.serviceDate}</td><td>{row.itemName}</td><td>{Number.isFinite(row.quantity) ? row.quantity : "—"}</td>
            <td><label className="sales-mapping-label">Article pour la ligne {row.line}
              <select value={mapping[row.itemName] ?? row.saleItemId ?? ""} onChange={(event) => chooseMapping(row.itemName, event.target.value)} disabled={row.status === "invalid" || committing}>
                <option value="">Non associé</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label></td>
            <td>{statusLabel[row.status]}{row.message ? ` — ${row.message}` : ""}</td>
          </tr>)}</tbody></table>
      </div>
      <Button type="button" disabled={!preview.readyCount || preview.alreadyImported || committing || loading} onClick={() => void commit()}>
        {committing ? "Import en cours…" : `Confirmer l’import de ${preview.readyCount} ligne(s)`}
      </Button>
    </>}
  </section>;
}
