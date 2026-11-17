import { useEffectEvent, useLayoutEffect, type RefObject } from "react";

const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]';

function focusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.tabIndex >= 0 && !element.matches(":disabled") &&
      !element.closest('[aria-hidden="true"], [inert]') && element.getClientRects().length > 0,
  );
}

interface DialogLayer {
  dialog: HTMLElement;
  onEscape: () => void;
}

const layers: DialogLayer[] = [];

function handleKeyDown(event: KeyboardEvent) {
  const layer = layers.at(-1);
  if (!layer) return;
  const { dialog, onEscape } = layer;

  if (event.key === "Escape") {
    event.preventDefault();
    onEscape();
    return;
  }
  if (event.key !== "Tab") return;

  const controls = focusableElements(dialog);
  const first = controls[0];
  const last = controls.at(-1);
  const active = document.activeElement;
  if (!first || !last || !dialog.contains(active) || active === dialog ||
      (event.shiftKey ? active === first : active === last)) {
    event.preventDefault();
    ((event.shiftKey ? last : first) ?? dialog).focus();
  }
}

let previousBodyOverflow = "";

export function useDialogFocus(
  dialogRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onClose: () => void,
  closeDisabled = false,
) {
  const closeFromKeyboard = useEffectEvent(() => { if (!closeDisabled) onClose(); });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (layers.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }
    const previousLayer = layers.at(-1);
    if (previousLayer) previousLayer.dialog.inert = true;
    const layer = { dialog, onEscape: () => closeFromKeyboard() };
    layers.push(layer);
    (focusableElements(dialog)[0] ?? dialog).focus();

    return () => {
      const wasActive = layers.at(-1) === layer;
      layers.splice(layers.indexOf(layer), 1);
      if (layers.length === 0) {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = previousBodyOverflow;
      }
      if (!wasActive) return;
      const active = layers.at(-1)?.dialog;
      if (active) active.inert = false;
      if (previousFocus?.isConnected && (!active || active.contains(previousFocus))) {
        previousFocus.focus();
      } else if (active) {
        (focusableElements(active)[0] ?? active).focus();
      }
    };
  }, [dialogRef, isOpen]);
}
