import { useEffect, useRef } from "react";
import { consumeFocusRestoreRequest } from "../../utils/focusRestoration";
import { History } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import type { StockMovement } from "../../services/productService";

interface ProductMovementHistoryProps {
  unit: string;
  focusedMovementId: string | null;
  returnHref?: string;
  movements: StockMovement[];
  movementsLoaded: boolean;
  historyError: string;
  onRetry: () => void;
}

const movementLabel = (reason: string) => ({
  loss: "Perte", initial: "Stock initial", receipt: "Réception", purchase_receipt: "Réception",
  invoice_import_demo: "Entrée depuis une transcription", simulated_consumption: "Sortie non rapprochée",
  simulated_unit_rounding: "Correction d’unité non rapprochée", simulation_opening: "Stock de départ à vérifier",
  simulation_restock: "Réapprovisionnement à vérifier", simulation_loss: "Perte estimée à vérifier",
  simulation_stock_adjustment: "Écart d’inventaire à vérifier",
  production: "Production", stock_count: "Écart de comptage",
}[reason] ?? "Ajustement");

export default function ProductMovementHistory({
  unit, focusedMovementId, returnHref, movements, movementsLoaded, historyError, onRetry,
}: ProductMovementHistoryProps) {
  const focusedMovementRef = useRef<HTMLDivElement>(null);
  const movementHeadingRef = useRef<HTMLHeadingElement>(null);
  const movementRetryButtonRef = useRef<HTMLButtonElement>(null);
  const movementRetryFocusPending = useRef(false);

  useEffect(() => {
    const movement = focusedMovementRef.current;
    if (!focusedMovementId || !movementsLoaded || !movement || movement.closest("[inert]")) return;
    movement.scrollIntoView({ block: "center" });
    movement.focus();
  }, [focusedMovementId, movements, movementsLoaded]);

  useEffect(() => {
    if (!movementsLoaded || !consumeFocusRestoreRequest(movementRetryFocusPending) || movementHeadingRef.current?.closest("[inert]")) return;
    if (historyError) movementRetryButtonRef.current?.focus();
    else if (focusedMovementId && focusedMovementRef.current) focusedMovementRef.current.focus();
    else movementHeadingRef.current?.focus();
  }, [focusedMovementId, historyError, movementsLoaded]);

  const retryMovementHistory = () => {
    movementRetryFocusPending.current = document.activeElement === movementRetryButtonRef.current;
    onRetry();
  };

  return (
    <section className="drawer-section">
      <h3 ref={movementHeadingRef} className="section-heading" tabIndex={-1}>
        <History size={18} /> Mouvements de stock
      </h3>
      <div className="history-list">
        {historyError ? <div role="alert"><p>{historyError} {returnHref &&
          <Link to={returnHref}>Retour au Bilan (même période)</Link>}</p>
          <Button ref={movementRetryButtonRef} type="button" variant="outline" onClick={retryMovementHistory}>Réessayer</Button></div>
          : !movementsLoaded ? <p role="status">Chargement de l’historique des mouvements…</p>
            : movements.length === 0 ? <p>Aucun mouvement enregistré.</p> : movements.map((movement) => (
          <div className="history-item" id={`stock-movement-${movement.id}`} key={movement.id} tabIndex={-1}
            ref={movement.id === focusedMovementId ? focusedMovementRef : undefined}>
            <span className="date">{new Date(movement.createdAt).toLocaleDateString("fr-FR")}</span>
            <span>{movement.delta > 0 ? "+" : ""}{movement.delta} {unit} ({movementLabel(movement.reason)})</span>
            {movement.sourceDocumentId && <Link to={`/orders?source=${encodeURIComponent(movement.sourceDocumentId)}#invoices`}>Ouvrir la pièce source</Link>}
            {movement.id === focusedMovementId && returnHref &&
              <Link to={returnHref}>Retour au Bilan (même période)</Link>}
          </div>
        ))}
        {focusedMovementId && movementsLoaded && !historyError && !movements.some((movement) => movement.id === focusedMovementId) &&
          <p role="status">Ce mouvement n’est pas présent dans l’historique de ce produit. {returnHref &&
            <Link to={returnHref}>Retour au Bilan (même période)</Link>}</p>}
      </div>
    </section>
  );
}
