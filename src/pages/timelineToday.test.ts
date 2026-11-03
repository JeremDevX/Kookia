import { afterEach, expect, it, vi } from "vitest";
import { watchTimelineToday } from "./timelineToday";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("actualise la date à Paris au changement de jour et au retour de visibilité", () => {
  vi.useFakeTimers().setSystemTime(new Date("2026-12-31T22:59:30Z"));
  const document = new EventTarget();
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", { setInterval, clearInterval });
  const setToday = vi.fn();
  const stop = watchTimelineToday(setToday);

  vi.advanceTimersByTime(60_000);
  expect(setToday).toHaveBeenLastCalledWith("2027-01-01");
  vi.setSystemTime(new Date("2027-01-02T12:00:00Z"));
  document.dispatchEvent(new Event("visibilitychange"));
  expect(setToday).toHaveBeenLastCalledWith("2027-01-02");

  stop();
  setToday.mockClear();
  vi.advanceTimersByTime(60_000);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(setToday).not.toHaveBeenCalled();
});
