import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "../services/timelineService";
import { filterTimelineEvents } from "./timelineSelectors";

const makeEvent = (id: string, overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id,
  kind: "stock",
  effectiveAt: "2026-09-25",
  knownAt: null,
  recordedAt: null,
  label: "Mouvement enregistré",
  detail: "Sortie de tomates · 2 kg",
  provenance: "recorded",
  ...overrides,
});

describe("filterTimelineEvents", () => {
  it("returns all events when the search is empty or whitespace", () => {
    const events = [makeEvent("one"), makeEvent("two")];

    expect(filterTimelineEvents(events, "")).toEqual(events);
    expect(filterTimelineEvents(events, "   ")).toEqual(events);
  });

  it("matches displayed details without case or accent sensitivity", () => {
    const events = [
      makeEvent("cream", { detail: "Crème fraîche · 2 kg" }),
      makeEvent("tomato"),
    ];

    expect(filterTimelineEvents(events, "CREME").map(({ id }) => id)).toEqual(["cream"]);
  });

  it("searches labels, details, and provenance qualifiers only", () => {
    const events = [
      makeEvent("label", { label: "Réception simulée" }),
      makeEvent("detail", { detail: "Aucune ligne liée au brouillon" }),
      makeEvent("qualifier", { qualifier: "Cette pièce reste inconnue." }),
      makeEvent("miss"),
    ];

    expect(filterTimelineEvents(events, "réception").map(({ id }) => id)).toEqual(["label"]);
    expect(filterTimelineEvents(events, "brouillon").map(({ id }) => id)).toEqual(["detail"]);
    expect(filterTimelineEvents(events, "inconnue").map(({ id }) => id)).toEqual(["qualifier"]);
    expect(filterTimelineEvents(events, "absent")).toEqual([]);
  });
});
