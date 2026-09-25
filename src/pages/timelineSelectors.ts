import type { TimelineEvent } from "../services/timelineService";

export const TIMELINE_VISIBLE_BATCH_SIZE = 20;

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function filterTimelineEvents(events: readonly TimelineEvent[], query: string): TimelineEvent[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return [...events];

  return events.filter((event) => normalizeSearchText([
    event.label,
    event.detail,
    event.qualifier ?? "",
  ].join(" ")).includes(normalizedQuery));
}
