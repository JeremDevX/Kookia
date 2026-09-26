import { describe, expect, it, vi } from "vitest";
import { scrollScrollableRegionWithArrowKeys } from "./scrollableRegion";

function keyboardEvent(key: string, scrollLeft: number, clientWidth = 200, scrollWidth = 1000) {
  const region = { scrollLeft, clientWidth, scrollWidth };
  const preventDefault = vi.fn();
  scrollScrollableRegionWithArrowKeys({ key, currentTarget: region, preventDefault } as unknown as
    Parameters<typeof scrollScrollableRegionWithArrowKeys>[0]);
  return { region, preventDefault };
}

describe("scrollScrollableRegionWithArrowKeys", () => {
  it("moves a focused region horizontally with the arrow keys", () => {
    const right = keyboardEvent("ArrowRight", 50);
    expect(right.region.scrollLeft).toBe(200);
    expect(right.preventDefault).toHaveBeenCalledOnce();

    const left = keyboardEvent("ArrowLeft", 200);
    expect(left.region.scrollLeft).toBe(50);
    expect(left.preventDefault).toHaveBeenCalledOnce();
  });

  it("does not intercept unrelated keys or arrows at the scroll boundary", () => {
    const unrelated = keyboardEvent("Enter", 50);
    expect(unrelated.region.scrollLeft).toBe(50);
    expect(unrelated.preventDefault).not.toHaveBeenCalled();

    const boundary = keyboardEvent("ArrowLeft", 0);
    expect(boundary.region.scrollLeft).toBe(0);
    expect(boundary.preventDefault).not.toHaveBeenCalled();
  });
});
