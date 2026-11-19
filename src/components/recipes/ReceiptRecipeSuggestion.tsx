import { useEffect, useRef, useState, type RefObject } from "react";
import { consumeFocusRestoreRequest } from "../../utils/focusRestoration";
import { suggestRecipeFromIncomingProduct, type RecipeSuggestion } from "../../domain/recipes/recipeSuggestionPolicy";
import { getPurchaseReceiptLineEvidence, type PurchaseReceiptLineEvidence } from "../../services/orderService";
import type { Product } from "../../types";
import Button from "../common/Button";
import RecipeSuggestionPanel from "./RecipeSuggestionPanel";

type ReceiptResult = { evidence: PurchaseReceiptLineEvidence } | { error: string };

export default function ReceiptRecipeSuggestion({ receiptLineId, products, ready, editing, pageHeading, onReview }: {
  receiptLineId: string; products: Product[]; ready: boolean; editing: boolean;
  pageHeading: RefObject<HTMLHeadingElement | null>;
  onReview: (suggestion: RecipeSuggestion, trigger: HTMLButtonElement) => void;
}) {
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [attempt, retry] = useState(0);
  const retryButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    let active = true;
    getPurchaseReceiptLineEvidence(receiptLineId).then(
      (evidence) => { if (active) setResult({ evidence }); },
      (cause: unknown) => { if (active) setResult({ error: cause instanceof Error ? cause.message : "Réessayez." }); },
    );
    return () => { active = false; };
  }, [receiptLineId, attempt]);

  useEffect(() => {
    if (!result || !consumeFocusRestoreRequest(restoreFocus)) return;
    if ("error" in result) retryButton.current?.focus();
    else pageHeading.current?.focus();
  }, [result, pageHeading]);

  if (!result) return <p role="status">Chargement de la réception source…</p>;
  if ("error" in result) return <div role="alert"><p>La réception source est indisponible : {result.error}</p>
    <Button ref={retryButton} type="button" variant="outline" onClick={() => {
      restoreFocus.current = document.activeElement === retryButton.current;
      setResult(null);
      retry((revision) => revision + 1);
    }}>Réessayer</Button>
  </div>;
  if (!ready) return null;

  const evidence = result.evidence;
  const product = products.find((item) => item.id === evidence.productId);
  const suggestion = product && suggestRecipeFromIncomingProduct(product, products, evidence.deliveryDate, {
    receiptLineId: evidence.receiptLineId, reference: evidence.deliveryReference,
    receivedQuantity: evidence.receivedQuantity, unit: evidence.unit, stockMovementId: evidence.stockMovementId,
  });
  return suggestion ? <RecipeSuggestionPanel disabled={editing} suggestion={suggestion} onReview={(trigger) => onReview(suggestion, trigger)} />
    : <p role="status">Aucune proposition de recette automatique n’est disponible pour cette réception. Vous pouvez créer une recette depuis le catalogue.</p>;
}
