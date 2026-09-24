import { expect, it } from "vitest";
import { timelineDateBounds } from "./timelineService.js";

it("uses Europe/Paris day bounds across the spring clock change", () => {
  const bounds = timelineDateBounds("2026-03-29", "2026-03-29", "2026-03-29");
  expect(bounds.start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
  expect(bounds.end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
  expect(bounds.knownThrough.toISOString()).toBe("2026-03-29T21:59:59.999Z");
});
