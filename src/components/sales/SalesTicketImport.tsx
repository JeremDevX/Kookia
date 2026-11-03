import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useBlocker, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { createTicketZCandidates as saveCandidates, deleteTicketZBatch, getTicketZBatches, uploadTicketZFile, type TicketZBatch } from "../../services/salesService";

export type TicketPreview = { contentHash: string; url: string; mimeType: TicketZBatch["mimeType"] };
type CandidateLine = { itemLabel: string; quantity: number };
const maxBytes = 4 * 1024 * 1024;
const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : "Réessayez.";
const statusLabel: Record<TicketZBatch["status"], string> = {
  uploaded: "Pièce prête à transcrire", candidates: "Lignes à réconcilier", no_details: "Aucun détail article", reviewed: "Revue terminée",
};

export default function SalesTicketImport({ onCandidatesSaved, onPreviewChanged }: {
  onCandidatesSaved: (serviceDate: string) => Promise<void>;
  onPreviewChanged: (preview: TicketPreview | null) => void;
}) {
  const [batches, setBatches] = useState<TicketZBatch[]>([]);
  const [batch, setBatch] = useState<TicketZBatch | null>(null);
  const [preview, setPreview] = useState<TicketPreview | null>(null);
  const [sourceDateText, setSourceDateText] = useState("");
  const [serviceDate, setServiceDate] = useState(parisToday);
  const [lines, setLines] = useState<CandidateLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState(false);
  const objectUrl = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { hash } = useLocation();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || saving || deleting) && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (saving || deleting) { blocker.reset(); setStatus("Patientez jusqu’à la fin de l’opération."); return; }
    if (window.confirm("La transcription non enregistrée sera perdue. Quitter cette page ?")) blocker.proceed();
    else blocker.reset();
  }, [blocker, saving, deleting]);
  useEffect(() => {
    if (!dirty && !saving && !deleting) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving, deleting]);

  useEffect(() => {
    if (hash === "#sales-ticket-title") heading.current?.focus();
  }, [hash]);

  const refresh = useCallback(async () => {
    setListLoading(true); setListError("");
    try { setBatches(await getTicketZBatches()); }
    catch (cause) { setListError(errorMessage(cause)); }
    finally { setListLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setStatus("");
    if (file.size === 0 || file.size > maxBytes) { setError("Le fichier doit peser entre 1 octet et 4 Mio."); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { setError("Choisissez un PDF, JPEG ou PNG."); return; }
    if (dirty && !window.confirm("La transcription non enregistrée sera perdue. Choisir un autre ticket ?")) return;
    const url = URL.createObjectURL(file);
    setLoading(true);
    try {
      const saved = await uploadTicketZFile(file);
      const nextPreview = { contentHash: saved.contentHash, url, mimeType: saved.mimeType };
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;
      setDirty(false);
      setBatch(saved); setPreview(nextPreview); onPreviewChanged(nextPreview);
      setSourceDateText(saved.sourceDateText ?? ""); setServiceDate(saved.serviceDate ?? parisToday());
      setLines([]);
      setStatus(saved.duplicate ? "Cette pièce existe déjà dans cet espace ; aucune nouvelle ligne n’a été ajoutée." :
        "Pièce reçue. L’original n’est pas conservé ; vous pouvez le lire ici pour transcrire les lignes.");
      await refresh();
      if (saved.status === "candidates" && saved.serviceDate) {
        try { await onCandidatesSaved(saved.serviceDate); }
        catch { setError("Ticket retrouvé, mais les ventes n’ont pas pu être actualisées. Actualisez la page."); }
      }
    } catch (cause) {
      if (objectUrl.current !== url) URL.revokeObjectURL(url);
      setError(errorMessage(cause));
    } finally { setLoading(false); }
  };

  const submitCandidates = async (event: FormEvent) => {
    event.preventDefault();
    if (!batch || batch.status !== "uploaded" || saving || deleting || loading) return;
    const cleanLines = lines.filter((line) => line.itemLabel.trim()).map((line) => ({ itemLabel: line.itemLabel.trim(), quantity: Number(line.quantity) }));
    if (lines.some((line) => line.itemLabel.trim() && (!Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1))) {
      setError("Chaque quantité de vente doit être un entier positif."); return;
    }
    setSaving(true); setError(""); setStatus("");
    try {
      const result = await saveCandidates(batch.id, { sourceDateText: sourceDateText.trim(), serviceDate, lines: cleanLines });
      setBatch(result);
      setDirty(false);
      setStatus(cleanLines.length ? `${cleanLines.length} ligne(s) enregistrée(s) comme candidate(s). Aucune ne compte avant la revue.` :
        "Ticket conservé sans détail article ; aucune vente ni quantité par article n’a été créée.");
      await refresh();
      if (cleanLines.length) {
        try { await onCandidatesSaved(serviceDate); }
        catch { setError("Transcription enregistrée, mais les ventes n’ont pas pu être actualisées. Actualisez la page."); }
      }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const removeBatch = async (id: string) => {
    if (saving || loading || deleting) return;
    if (batch?.id === id && dirty && !window.confirm("La transcription non enregistrée sera perdue. Supprimer ce brouillon ?")) return;
    setError(""); setStatus(""); setDeleting(true);
    try {
      await deleteTicketZBatch(id);
      setBatches((current) => current.filter((row) => row.id !== id));
      if (batch?.id === id) {
        setBatch(null); setPreview(null); onPreviewChanged(null); setLines([]); setDirty(false);
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
      setStatus("Brouillon Ticket Z supprimé. Aucun original n’était conservé côté serveur.");
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setDeleting(false); }
  };

  return <section className="sales-panel sales-ticket-import" aria-labelledby="sales-ticket-title">
    <h2 id="sales-ticket-title" ref={heading} tabIndex={-1}>Transcrire un Ticket Z</h2>
    <p>Lecture manuelle depuis l’original : aucune OCR n’est connectée. Le fichier est vérifié temporairement pour son type et son empreinte, puis supprimé ; seul le hash et votre transcription sont conservés. Il n’est envoyé à aucun prestataire.</p>
    <label className="sales-file-label">Fichier PDF, JPEG ou PNG (4 Mio maximum)
      <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={loading || saving || deleting} onChange={(event) => void selectFile(event)} />
    </label>
    {listLoading && <p role="status">Chargement des Tickets Z…</p>}
    {listError && <div role="alert"><p>Historique des Tickets Z indisponible : {listError}</p>
      <Button type="button" variant="outline" disabled={saving || deleting} onClick={() => { void refresh(); requestAnimationFrame(() => heading.current?.focus()); }}>Réessayer</Button></div>}
    {loading && <p role="status">Vérification du fichier…</p>}
    {deleting && <p role="status">Suppression du brouillon…</p>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {batch?.status === "candidates" && <p><a href="#sales-reconciliation-title">Vérifier les lignes transcrites</a></p>}
    {batch && preview && <div className="ticket-transcription-layout">
      <figure className="ticket-original-preview">
        <figcaption>Original visible sur cet appareil · empreinte {batch.contentHash.slice(0, 12)}… · {Math.ceil(batch.byteSize / 1024)} Ko</figcaption>
        {preview.mimeType === "application/pdf" ? <iframe title="Aperçu local du Ticket Z" src={preview.url} /> :
          <img src={preview.url} alt="Aperçu local du ticket de caisse" />}
        <a href={preview.url} target="_blank" rel="noreferrer">Ouvrir l’original dans un onglet</a>
      </figure>
      {batch.status === "uploaded" ? <form className="ticket-transcription-form" onSubmit={(event) => void submitCandidates(event)} onChange={() => setDirty(true)}>
        <fieldset disabled={saving || loading || deleting}>
        <h3>Transcription candidate</h3>
        <label>Date lue sur le ticket<input value={sourceDateText} maxLength={80} onChange={(event) => setSourceDateText(event.target.value)} placeholder="Date telle qu’imprimée, si lisible" /></label>
        <label>Jour de service retenu<input type="date" required value={serviceDate} max={parisToday()} onChange={(event) => setServiceDate(event.target.value)} /></label>
        {sourceDateText && <p role="status">Comparez la date lue au jour de service avant d’enregistrer.</p>}
        <p>Seules les lignes d’articles détaillées peuvent devenir des ventes candidates. Un total général ou un ticket sans détail ne crée pas d’unités par article.</p>
        <div className="ticket-transcription-lines"><h4>Lignes d’articles lisibles</h4>
          {lines.map((line, index) => <fieldset key={index}><legend>Ligne {index + 1}</legend>
            <label>Article<input required value={line.itemLabel} maxLength={120} onChange={(event) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, itemLabel: event.target.value } : row))} /></label>
            <label>Quantité vendue<input type="number" required min="1" max="1000000" step="1" value={line.quantity} onChange={(event) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))} /></label>
            <Button type="button" variant="outline" disabled={saving} onClick={() => { setDirty(true); setLines((current) => current.filter((_, rowIndex) => rowIndex !== index)); }}>Retirer cette ligne</Button>
          </fieldset>)}
        </div>
        <div className="sales-actions"><Button type="button" variant="outline" disabled={saving || lines.length >= 200} onClick={() => { setDirty(true); setLines((current) => [...current, { itemLabel: "", quantity: 1 }]); }}>Ajouter une ligne</Button>
          <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : lines.length ? "Enregistrer les lignes à réconcilier" : "Enregistrer sans détail article"}</Button></div>
        </fieldset>
      </form> : <p>{statusLabel[batch.status]} · {batch.recordCount} ligne(s). L’original reste visible uniquement jusqu’à ce que vous quittiez cette page.</p>}
    </div>}
    {!listError && batches.length > 0 && <details className="sales-disclosure"><summary>Tickets et transcriptions récents ({batches.length})</summary>
      <ul className="sales-contribution-history">{batches.map((row) => <li key={row.id}>
        <strong>{row.serviceDate ?? "Date de service à vérifier"} · {statusLabel[row.status]}</strong>
        <span>{row.recordCount} ligne(s) · {row.provenance === "demo_simulation" ? "hors bilan" : "donnée transcrite"} · empreinte {row.contentHash.slice(0, 12)}… · original non conservé</span>
        {(row.status === "uploaded" || row.status === "no_details") && <Button type="button" variant="outline" disabled={saving || loading || deleting} onClick={() => void removeBatch(row.id)}>Supprimer ce brouillon</Button>}
      </li>)}</ul>
    </details>}
  </section>;
}
