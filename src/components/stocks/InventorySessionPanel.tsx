import { useEffect, useRef, type MouseEvent } from "react";
import { useBlocker } from "react-router-dom";
import Button from "../common/Button";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useInventorySession } from "../../features/inventory/useInventorySession";
import InventoryCountTable from "./InventoryCountTable";

type PanelProps = { search: string; category: string; onRefresh: () => Promise<unknown>; onClearFilters: () => void };

export default function InventorySessionPanel(props: PanelProps) {
  const { user } = useAuth();
  return user ? <AccountInventorySessionPanel key={user.id} {...props} userId={user.id} /> : null;
}

function AccountInventorySessionPanel({ search, category, onRefresh, onClearFilters, userId }: PanelProps & { userId: string }) {
  const { state, reload, start, verify, submit, reconcile, refresh, discard, edit } = useInventorySession(userId, onRefresh);
  const dirty = state.status === "ready" && state.draft?.dirty === true;
  const busy = "busy" in state && state.busy;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty &&
    (currentLocation.pathname !== nextLocation.pathname || new URLSearchParams(nextLocation.search).get("stockView") !== "count"));
  const focusOrigin = useRef<HTMLButtonElement | null>(null);
  const focusStatus = useRef<HTMLParagraphElement>(null);
  const focusRetry = useRef<HTMLButtonElement>(null);

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
    if (state.status === "loading" || busy || !focusOrigin.current) return;
    const origin = focusOrigin.current;
    focusOrigin.current = null;
    if (document.activeElement !== document.body) return;
    if (origin.isConnected && !origin.disabled) origin.focus();
    else (focusRetry.current ?? focusStatus.current)?.focus();
  }, [state, busy]);

  const act = (event: MouseEvent<HTMLButtonElement>, run: () => void | Promise<void>) => {
    if (document.activeElement === event.currentTarget) focusOrigin.current = event.currentTarget;
    void run();
  };

  const legacyNotice = "legacyPending" in state && state.legacyPending &&
    <p role="alert">Une ancienne validation reste à vérifier, mais son compte et son établissement ne sont pas identifiés. Vérifiez l’historique des comptages avant de refaire l’inventaire.</p>;
  if (state.status === "pending") return <div className="inventory-session">
    <p role={state.error ? "alert" : "status"} ref={focusStatus} tabIndex={-1}>{state.error || "Vérification de la validation…"}</p>
    <Button ref={focusRetry} disabled={busy} onClick={(event) => act(event, () => verify(state))}>Vérifier la validation</Button>
  </div>;
  if (state.status === "discarded") return <p role="status" ref={focusStatus} tabIndex={-1} className="inventory-footnote">Brouillon supprimé. Revenez aux stocks pour commencer un nouvel inventaire.</p>;
  if (state.status === "validated") return <p role="status" ref={focusStatus} tabIndex={-1} className="inventory-footnote">Inventaire validé. Les produits non comptés restent à vérifier.</p>;
  if (state.status === "loading") return <div className="inventory-session"><p role="status">Chargement de l’inventaire…</p></div>;
  if (state.status === "load-error") return <div className="inventory-session">
    <p role="alert">{state.error}</p>
    <Button ref={focusRetry} variant="outline" onClick={(event) => act(event, reload)}>Réessayer</Button>
  </div>;
  if (!state.draft) return <div className="inventory-session">
    {legacyNotice}
    <p>Aucun inventaire en cours.</p>
    {state.error && <p role="alert">{state.error}</p>}
    <Button ref={focusRetry} disabled={busy} onClick={(event) => act(event, start)}>Commencer l’inventaire</Button>
  </div>;

  const { draft, recovery, error } = state;
  const counted = draft.session.lines.filter((line) => draft.values[line.productId]?.trim()).length;
  const conflictCount = Object.keys(draft.conflicts).length;
  const needComparison = recovery === "compare" || recovery === "compare-before-refresh";
  const needRefresh = recovery === "refresh" || recovery === "compare-before-refresh";

  return <div className="inventory-session">
    {legacyNotice}
    <p role="status" ref={focusStatus} tabIndex={-1}>{counted} / {draft.session.lines.length} produits comptés</p>
    {conflictCount > 0 && <p role="alert">{conflictCount} saisie(s) à comparer. <button type="button" className="inventory-reset" onClick={onClearFilters}>Afficher tous les produits</button></p>}
    <InventoryCountTable draft={draft} search={search} category={category} busy={Boolean(busy)} countDisabled={Boolean(busy || needRefresh)} edit={edit} />
    {error && <p role="alert">{error}</p>}
    {needComparison && <div><p>Récupérez le brouillon enregistré pour comparer les saisies, sans effacer les vôtres.</p>
      <Button ref={focusRetry} variant="outline" disabled={busy} onClick={(event) => act(event, reconcile)}>Comparer les saisies</Button></div>}
    {recovery === "refresh" && <div><p>Les anciens comptages resteront visibles comme repères. Actualisez les stocks puis recomptez les produits concernés avant de valider.</p>
      <Button ref={focusRetry} variant="outline" disabled={busy || conflictCount > 0} onClick={(event) => act(event, refresh)}>Actualiser les stocks</Button></div>}
    <div className="inventory-session-actions">
      <Button variant="outline" disabled={busy} onClick={(event) => {
        if (window.confirm("Supprimer ce brouillon et ses quantités saisies ? Les stocks ne seront pas modifiés.")) act(event, discard);
      }}>Supprimer le brouillon</Button>
      <Button variant="outline" disabled={busy || needComparison || conflictCount > 0} onClick={(event) => act(event, () => submit(false))}>Enregistrer le brouillon</Button>
      <Button disabled={busy || counted === 0 || Boolean(recovery) || conflictCount > 0} onClick={(event) => act(event, () => submit(true))}>Valider l’inventaire</Button>
    </div>
  </div>;
}
