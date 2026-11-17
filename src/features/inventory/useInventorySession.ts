import { useEffect, useState } from "react";
import { ApiError } from "../../config/api";
import { discardInventory, getInventory, getInventoryWorkspace, openInventory, refreshInventory, saveInventory, validateInventory,
  type InventorySession } from "../../services/inventorySessionService";
import { inventoryForSave, reconcileInventoryDraft, toInventoryDraft, type InventoryDraft } from "./inventoryDraft";

type Validation = Pick<InventorySession, "id" | "revision">;
type Recovery = "compare" | "refresh" | "compare-before-refresh";
interface Location { restaurantId: string; legacyPending: boolean; }
type Ready = Location & { status: "ready"; draft: InventoryDraft | null; recovery?: Recovery; error?: string; busy?: boolean };
type Pending = Location & { status: "pending"; draft: InventoryDraft | null; operation: Validation; error?: string; busy?: boolean };
type InventoryState = Ready | Pending | { status: "loading" } | { status: "load-error"; error: string }
  | { status: "validated" } | { status: "discarded" };

const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;
const openError = "Impossible d’ouvrir l’inventaire.";
const pendingKey = (userId: string, restaurantId: string) => `inventory-pending-validation:${userId}:${restaurantId}`;

function readPending(key: string): Validation | null {
  const stored = sessionStorage.getItem(key);
  if (stored === null) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string" || !value.id ||
        !("revision" in value) || typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error();
    return { id: value.id, revision: value.revision };
  } catch {
    throw new Error("La validation enregistrée ne peut pas être vérifiée. Consultez l’historique des comptages avant de continuer.");
  }
}

function definitiveInventoryError(error: unknown): error is ApiError {
  return error instanceof ApiError && (
    (error.status === 400 && ["EMPTY_INVENTORY", "MISSING_REASON", "INVALID_LINES", "VALIDATION_ERROR"].includes(error.details.code)) ||
    (error.status === 409 && ["INVENTORY_CHANGED", "STOCK_CHANGED", "OPERATION_CONFLICT"].includes(error.details.code))
  );
}

function recoveryFor(cause: unknown, current?: Recovery): Recovery | undefined {
  if (!definitiveInventoryError(cause)) return current;
  if (cause.details.code === "STOCK_CHANGED") return "refresh";
  if (cause.details.code === "INVENTORY_CHANGED") {
    return current === "refresh" || current === "compare-before-refresh" ? "compare-before-refresh" : "compare";
  }
  return current;
}

export function useInventorySession(userId: string, onRefresh: () => Promise<unknown>) {
  const [state, setState] = useState<InventoryState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { restaurantId } = await getInventoryWorkspace();
        if (!active) return;
        const operation = readPending(pendingKey(userId, restaurantId));
        const legacyPending = sessionStorage.getItem("inventory-pending-validation") !== null;
        const scope = { restaurantId, legacyPending };
        // The saved validation reference can be checked even when the draft read is unavailable.
        if (operation) {
          setState({ ...scope, status: "pending", operation, draft: null });
          return;
        }
        const draft = await getInventory(restaurantId);
        if (active) setState({ ...scope, status: "ready", draft: draft ? toInventoryDraft(draft) : null });
      } catch (cause) {
        if (active) setState({ status: "load-error", error: message(cause, openError) });
      }
    };
    void load();
    return () => { active = false; };
  }, [loadAttempt, userId]);

  const reload = () => {
    setState({ status: "loading" });
    setLoadAttempt((attempt) => attempt + 1);
  };

  const start = async () => {
    if (state.status !== "ready" || state.busy || state.draft) return;
    setState({ ...state, busy: true, error: undefined });
    try {
      const draft = await openInventory(state.restaurantId);
      setState({ ...state, draft: toInventoryDraft(draft), busy: false, error: undefined });
    } catch (cause) { setState({ ...state, busy: false, error: message(cause, openError) }); }
  };

  const verify = async (pending: Pending) => {
    if (pending.busy) return;
    const storageKey = pendingKey(userId, pending.restaurantId);
    setState({ ...pending, busy: true, error: undefined });
    try {
      await validateInventory(pending.operation, pending.restaurantId);
      sessionStorage.removeItem(storageKey);
    } catch (cause) {
      const error = message(cause, "La validation n’a pas pu être vérifiée.");
      if (!definitiveInventoryError(cause)) {
        setState({ ...pending, busy: false, error });
        return;
      }
      try { sessionStorage.removeItem(storageKey); }
      catch {
        setState({ ...pending, busy: false, error: "Impossible de mettre à jour la validation mémorisée. Réessayez." });
        return;
      }
      const recovery = recoveryFor(cause);
      let draft = pending.draft;
      if (!draft) {
        try {
          const latest = await getInventory(pending.restaurantId);
          if (latest) draft = toInventoryDraft(latest);
        } catch (openCause) {
          setState({ status: "load-error", error: message(openCause, openError) });
          return;
        }
      }
      const { restaurantId, legacyPending } = pending;
      setState({ restaurantId, legacyPending, status: "ready", draft, recovery: draft ? recovery : undefined, error });
      return;
    }
    setState({ status: "validated" });
    await onRefresh();
  };

  const submit = async (validate: boolean) => {
    if (state.status !== "ready" || !state.draft || state.busy || Object.keys(state.draft.conflicts).length ||
        state.recovery === "compare" || state.recovery === "compare-before-refresh" || (validate && state.recovery)) return;
    const input = inventoryForSave(state.draft, validate);
    if ("error" in input) { setState({ ...state, error: input.error }); return; }
    setState({ ...state, busy: true, error: undefined });
    let saved: InventorySession;
    try { saved = await saveInventory(input.session, state.restaurantId); }
    catch (cause) {
      setState({ ...state, busy: false, recovery: recoveryFor(cause, state.recovery),
        error: message(cause, "L’inventaire n’a pas été enregistré.") });
      return;
    }
    const draft = { ...state.draft, session: saved, dirty: false };
    if (!validate) { setState({ ...state, draft, error: undefined, busy: false }); return; }
    const { restaurantId, legacyPending } = state;
    const operation = { id: saved.id, revision: saved.revision };
    try { sessionStorage.setItem(pendingKey(userId, restaurantId), JSON.stringify(operation)); }
    catch {
      setState({ ...state, draft, busy: false, error: "Impossible de mémoriser la validation. Réessayez." });
      return;
    }
    await verify({ restaurantId, legacyPending, status: "pending", operation, draft });
  };

  const reconcile = async () => {
    if (state.status !== "ready" || !state.draft || state.busy) return;
    setState({ ...state, busy: true, error: undefined });
    try {
      const latest = await getInventory(state.restaurantId);
      if (!latest || latest.id !== state.draft.session.id) {
        setState({ ...state, busy: false, error: "Ce brouillon n’est plus disponible. Vos saisies restent visibles." });
        return;
      }
      setState({ ...state, busy: false, error: undefined, draft: reconcileInventoryDraft(state.draft, latest, true),
        recovery: state.recovery === "compare-before-refresh" ? "refresh" : undefined });
    } catch (cause) {
      setState({ ...state, busy: false, error: message(cause, "Récupération du brouillon impossible.") });
    }
  };

  const refresh = async () => {
    if (state.status !== "ready" || !state.draft || state.busy || state.recovery !== "refresh" ||
        Object.keys(state.draft.conflicts).length) return;
    setState({ ...state, busy: true, error: undefined });
    try {
      const updated = await refreshInventory(state.draft.session, state.restaurantId);
      setState({ ...state, busy: false, error: undefined, recovery: undefined, draft: reconcileInventoryDraft(state.draft, updated, false) });
    } catch (cause) {
      setState({ ...state, busy: false, recovery: recoveryFor(cause, state.recovery), error: message(cause, "Actualisation impossible.") });
    }
  };

  const discard = async () => {
    if (state.status !== "ready" || !state.draft || state.busy) return;
    setState({ ...state, busy: true, error: undefined });
    try {
      await discardInventory(state.draft.session, state.restaurantId);
      setState({ status: "discarded" });
    } catch (cause) {
      setState({ ...state, busy: false, recovery: recoveryFor(cause, state.recovery), error: message(cause, "Suppression impossible.") });
    }
  };

  const edit = (apply: (draft: InventoryDraft) => InventoryDraft) => {
    setState((current) => current.status === "ready" && current.draft && !current.busy
      ? { ...current, draft: { ...apply(current.draft), dirty: true } } : current);
  };

  return { state, reload, start, submit, verify, reconcile, refresh, discard, edit };
}
