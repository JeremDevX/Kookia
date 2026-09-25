import type { KeyboardEvent } from "react";

export function scrollScrollableRegionWithArrowKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const region = event.currentTarget;
  const maximum = Math.max(0, region.scrollWidth - region.clientWidth);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const step = Math.max(48, Math.floor(region.clientWidth * 0.75));
  const next = Math.min(maximum, Math.max(0, region.scrollLeft + direction * step));
  if (next === region.scrollLeft) return;
  event.preventDefault();
  region.scrollLeft = next;
}
