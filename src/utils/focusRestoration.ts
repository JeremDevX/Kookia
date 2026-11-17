import type { RefObject } from "react";

export function consumeFocusRestoreRequest(pending: RefObject<boolean>): boolean {
  if (!pending.current) return false;
  pending.current = false;
  return document.activeElement === document.body;
}
