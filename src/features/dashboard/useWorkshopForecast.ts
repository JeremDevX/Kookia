import { useEffect, useState } from "react";
import { formatParisDate } from "../../../shared/parisDate";
import type { WorkshopForecast } from "../../../shared/workshopForecast";
import { apiRequest } from "../../config/api";

export function useWorkshopForecast() {
  const [forecast, setForecast] = useState<WorkshopForecast | null>(null);

  useEffect(() => {
    let lastRequestedAt = 0;
    let requestedDate = "";
    let pending: AbortController | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = new Date();
      requestedDate = formatParisDate(now);
      lastRequestedAt = now.getTime();
      setForecast(current => current?.date === requestedDate ? current : null);
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      void apiRequest<{ forecast: WorkshopForecast | null }>("/workspace/dashboard/forecast", { signal: controller.signal }).then(
        (result) => {
          if (!controller.signal.aborted) setForecast(result.forecast?.date === formatParisDate() ? result.forecast : null);
        },
        () => { if (!controller.signal.aborted) setForecast(null); },
      );
    };

    refresh();
    const timer = window.setInterval(() => {
      const now = new Date();
      if (formatParisDate(now) !== requestedDate || now.getTime() - lastRequestedAt >= 5 * 60_000) refresh();
    }, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      pending?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return forecast?.date === formatParisDate() ? forecast : null;
}
