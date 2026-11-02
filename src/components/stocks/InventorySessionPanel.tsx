import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import Button from "../common/Button";
import { ApiError } from "../../config/api";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import { openInventory, getInventory, saveInventory, validateInventory, refreshInventory, discardInventory, type InventorySession } from "../../services/inventorySessionService";

export default function InventorySessionPanel({ search, category, onRefresh, onClearFilters }: { search: string; category: string; onRefresh: () => Promise<unknown>; onClearFilters: () => void }) {
  const [session, setSession] = useState<InventorySession | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [needsReconcile, setNeedsReconcile] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, { quantity: number | null; reason: string }>>({});
  const [localPrior, setLocalPrior] = useState<Record<string, { value: string; unit: string; reason: string }>>({});
  const [pending, setPending] = useState<Pick<InventorySession, "id" | "revision"> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty &&
    (currentLocation.pathname !== nextLocation.pathname || new URLSearchParams(nextLocation.search).get("stockView") !== "count"));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Les quantités non enregistrées seront perdues. Quitter l’inventaire ?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    void getInventory().then((draft) => {
      if (!active) return;
      setSession(draft);
      if (draft) setValues(Object.fromEntries(draft.lines.map((line) => [line.productId, line.countedQuantity?.toString() ?? ""])));
      const savedPending = sessionStorage.getItem("inventory-pending-validation");
      if (savedPending) setPending(JSON.parse(savedPending) as Pick<InventorySession, "id" | "revision">);
      setError(""); setLoaded(true);
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Impossible d’ouvrir l’inventaire."); setLoaded(true); }
    });
    return () => { active = false; };
  }, [loadAttempt]);
  const startInventory = async () => {
    setBusy(true); setError("");
    try {
      const draft = await openInventory();
      setSession(draft); setValues(Object.fromEntries(draft.lines.map((line) => [line.productId, line.countedQuantity?.toString() ?? ""])));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible d’ouvrir l’inventaire."); }
    finally { setBusy(false); }
  };
  const checkPending = async (operation: Pick<InventorySession, "id" | "revision">) => {
    setBusy(true); setError("");
    try { await validateInventory(operation); sessionStorage.removeItem("inventory-pending-validation"); setPending(null); setFinished(true); await onRefresh(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status < 500) {
        sessionStorage.removeItem("inventory-pending-validation"); setPending(null); setNeedsRefresh(cause.details.code === "STOCK_CHANGED");
        if (!session) {
          try { const draft = await getInventory(); setSession(draft); if (draft) setValues(Object.fromEntries(draft.lines.map((line) => [line.productId, line.countedQuantity?.toString() ?? ""]))); }
          catch (openError) { setError(openError instanceof Error ? openError.message : "Impossible d’ouvrir l’inventaire."); return; }
        }
      }
      setError(cause instanceof Error ? cause.message : "La validation n’a pas pu être vérifiée.");
    } finally { setBusy(false); }
  };
  const reconcile = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const latest = await getInventory();
      if (!latest || latest.id !== session.id) { setError("Ce brouillon n’est plus disponible. Vos saisies restent visibles."); return; }
      const local = new Map(session.lines.map((line) => [line.productId, line]));
      const nextValues = { ...values };
      const nextPrior = { ...localPrior };
      const nextConflicts: Record<string, { quantity: number | null; reason: string }> = {};
      const lines = latest.lines.map((line) => {
        const previous = local.get(line.productId);
        if (!previous) return line;
        if (previous.stockRevision !== line.stockRevision || previous.unit !== line.unit || line.available === false) {
          if (values[line.productId]?.trim()) nextPrior[line.productId] = { value: values[line.productId], unit: previous.unit, reason: previous.reason };
          nextValues[line.productId] = line.countedQuantity?.toString() ?? "";
          return line;
        }
        const value = values[line.productId]?.trim() ? Number(values[line.productId].replace(",", ".")) : null;
        if (value !== line.countedQuantity || previous.reason !== line.reason) nextConflicts[line.productId] = { quantity: line.countedQuantity, reason: line.reason };
        return { ...line, reason: previous.reason };
      });
      setValues(nextValues); setLocalPrior(nextPrior); setSession({ ...latest, lines }); setConflicts(nextConflicts); setNeedsReconcile(false); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Récupération du brouillon impossible."); }
    finally { setBusy(false); }
  };
  const clearConflict = (id: string) => setConflicts((current) => { const next = { ...current }; delete next[id]; return next; });
  const counted = session?.lines.filter((line) => values[line.productId]?.trim()).length ?? 0;
  const submit = async (validate: boolean) => {
    if (!session || busy) return;
    const lines = session.lines.map((line) => ({ ...line, countedQuantity: values[line.productId]?.trim() ? Number(values[line.productId].replace(",", ".")) : null }));
    if (lines.some((line) => line.countedQuantity !== null && (!Number.isFinite(line.countedQuantity) || line.countedQuantity < 0 || line.countedQuantity > 1000000 || !/^\d+(?:[.,]\d{1,3})?$/.test(values[line.productId])))) {
      setError("Indiquez des quantités positives ou nulles, avec trois décimales au maximum."); return;
    }
    if (validate && lines.some((line) => line.countedQuantity !== null && line.countedQuantity !== line.theoreticalQuantity && !line.reason.trim())) {
      setError("Justifiez chaque écart avant validation."); return;
    }
    setBusy(true); setError("");
    try {
      const saved = await saveInventory({ ...session, lines }); setSession(saved); setDirty(false);
      if (validate) {
        const operation = { id: saved.id, revision: saved.revision };
        sessionStorage.setItem("inventory-pending-validation", JSON.stringify(operation)); setPending(operation);
        await validateInventory(operation); sessionStorage.removeItem("inventory-pending-validation"); setPending(null); setFinished(true); await onRefresh();
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status < 500) { sessionStorage.removeItem("inventory-pending-validation"); setPending(null); setNeedsRefresh(cause.details.code === "STOCK_CHANGED"); setNeedsReconcile(cause.details.code === "INVENTORY_CHANGED"); }
      setError(cause instanceof Error ? cause.message : "L’inventaire n’a pas été enregistré.");
    }
    finally { setBusy(false); }
  };
  if (pending) return <div className="inventory-session"><p role="alert">{error || "Vérification de la validation…"}</p><Button disabled={busy} onClick={() => void checkPending(pending)}>Vérifier la validation</Button></div>;
  if (discarded) return <p role="status" className="inventory-footnote">Brouillon supprimé. Revenez aux stocks pour commencer un nouvel inventaire.</p>;
  if (finished) return <p role="status" className="inventory-footnote">Inventaire validé. Les produits non comptés restent à vérifier.</p>;
  if (!session) return <div className="inventory-session">
    {!loaded ? <p role="status">Chargement de l’inventaire…</p> : error ? <><p role="alert">{error}</p><Button variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Réessayer</Button></> :
      <><p>Aucun inventaire en cours.</p><Button disabled={busy} onClick={() => void startInventory()}>Commencer l’inventaire</Button></>}
  </div>;
  const visible = session.lines.filter((line) => line.name.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")) && (category === "all" || line.category === category));
  return <div className="inventory-session">
    <p role="status">{counted} / {session.lines.length} produits comptés</p>
    {Object.keys(conflicts).length > 0 && <p role="alert">{Object.keys(conflicts).length} saisie(s) à comparer. <button type="button" className="inventory-reset" onClick={onClearFilters}>Afficher tous les produits</button></p>}
    <div className="stocks-table-card stock-count-list" role="region" aria-label="Inventaire des produits — défilement horizontal avec les flèches" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="stocks-table"><thead><tr><th scope="col">Produit</th><th scope="col">Unité</th><th scope="col">Stock théorique</th><th scope="col">Quantité comptée</th><th scope="col">Écart et justification</th></tr></thead>
        <tbody>{visible.map((line) => {
          const value = values[line.productId] ?? ""; const quantity = value.trim() ? Number(value.replace(",", ".")) : null;
          const delta = quantity === null || !Number.isFinite(quantity) ? null : Math.round((quantity - line.theoreticalQuantity) * 1000) / 1000;
          const conflict = conflicts[line.productId];
          return <tr key={line.productId}><th scope="row">{line.name}{line.available === false && <small className="stock-cell-note">Produit indisponible</small>}{line.previousCount && <small className="stock-cell-note">Ancien comptage à vérifier : {line.previousCount.quantity} {line.previousCount.unit}{line.previousCount.reason && ` · ${line.previousCount.reason}`}</small>}{localPrior[line.productId] && <small className="stock-cell-note">Votre saisie précédente : {localPrior[line.productId].value} {localPrior[line.productId].unit}{localPrior[line.productId].reason && ` · ${localPrior[line.productId].reason}`}</small>}{conflict && <div className="stock-cell-note">Valeur enregistrée : {conflict.quantity === null ? "non compté" : `${conflict.quantity} ${line.unit}`} {conflict.reason && `· ${conflict.reason}`}
            <Button variant="outline" size="sm" onClick={() => { setDirty(true); clearConflict(line.productId); }}>Garder ma saisie</Button>
            <Button variant="outline" size="sm" onClick={() => { setDirty(true); setValues({ ...values, [line.productId]: conflict.quantity?.toString() ?? "" }); setSession({ ...session, lines: session.lines.map((item) => item.productId === line.productId ? { ...item, reason: conflict.reason } : item) }); clearConflict(line.productId); }}>Prendre la valeur enregistrée</Button></div>}</th><td><span className="inventory-mobile-label">Unité</span>{line.unit}</td><td><span className="inventory-mobile-label">Stock théorique</span>{line.theoreticalQuantity.toLocaleString("fr-FR")} {line.unit}</td>
            <td><span className="inventory-mobile-label">Quantité comptée</span><input type="number" min="0" max="1000000" step="0.001" aria-label={`Quantité comptée : ${line.name}`} value={value} disabled={busy || needsRefresh || line.available === false} onChange={(event) => { setDirty(true); setValues({ ...values, [line.productId]: event.target.value }); }} /></td>
            <td><span className="inventory-mobile-label">Écart et justification</span>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toLocaleString("fr-FR")} ${line.unit}`}
              {delta !== null && delta !== 0 && <input aria-label={`Justification de l’écart : ${line.name}`} placeholder="Cause de l’écart" maxLength={1000} value={line.reason} disabled={busy || needsRefresh} onChange={(event) => { setDirty(true); setSession({ ...session, lines: session.lines.map((item) => item.productId === line.productId ? { ...item, reason: event.target.value } : item) }); }} />}</td></tr>;
        })}</tbody></table>
    </div>
    {error && <p role="alert">{error}</p>}
    {needsReconcile && <div><p>Récupérez le brouillon enregistré pour comparer les saisies, sans effacer les vôtres.</p><Button variant="outline" disabled={busy} onClick={() => void reconcile()}>Comparer les saisies</Button></div>}
    {needsRefresh && <div><p>Les anciens comptages resteront visibles comme repères. Actualisez les stocks puis recomptez les produits concernés avant de valider.</p>
      <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void refreshInventory(session).then((updated) => { setSession(updated); setValues(Object.fromEntries(updated.lines.map((line) => [line.productId, line.countedQuantity?.toString() ?? ""]))); setNeedsRefresh(false); setError(""); }).catch((cause: unknown) => { if (cause instanceof ApiError && cause.details.code === "INVENTORY_CHANGED") setNeedsReconcile(true); setError(cause instanceof Error ? cause.message : "Actualisation impossible."); }).finally(() => setBusy(false)); }}>Actualiser les stocks</Button></div>}
    <div className="inventory-session-actions"><Button variant="outline" disabled={busy} onClick={() => {
      if (!window.confirm("Supprimer ce brouillon et ses quantités saisies ? Les stocks ne seront pas modifiés.")) return;
      setBusy(true); void discardInventory(session).then(() => { setDirty(false); setDiscarded(true); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Suppression impossible.")).finally(() => setBusy(false));
    }}>Supprimer le brouillon</Button><Button variant="outline" disabled={busy || needsReconcile || Object.keys(conflicts).length > 0} onClick={() => void submit(false)}>Enregistrer le brouillon</Button><Button disabled={busy || counted === 0 || needsRefresh || needsReconcile || Object.keys(conflicts).length > 0} onClick={() => void submit(true)}>Valider l’inventaire</Button></div>
  </div>;
}
