import { formatParisDate } from "../../../../shared/parisDate.js";
import type { WorkshopWeather } from "../../../../shared/workshopWeather.js";
import type { WeatherProvider } from "../../integrations/weatherProvider.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { getServiceWeather } from "./serviceWeatherService.js";
import { readWeatherCache } from "./weatherStorage.js";
import { WorkspaceError } from "./workspaceError.js";

export async function getWorkshopWeather(restaurantId: string, provider: WeatherProvider,
  allowOperationalTestWorkspace: boolean): Promise<WorkshopWeather> {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true, hasTerrace: true } });
  if (!restaurant) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
  if (restaurant.mode !== "demo" && !allowOperationalTestWorkspace)
    throw new WorkspaceError(403, "DEMO_WORKSPACE_REQUIRED", "La météo de l’atelier exige un établissement de test autorisé.");

  const fallback = { hasTerrace: restaurant.hasTerrace, forecast: null };
  if (!provider.configured || provider.provenance !== "live") return fallback;
  const current = await getServiceWeather(restaurantId, formatParisDate(), "lunch", provider, { matchSavedCity: true });
  if (current.provenance !== "live" || !["ready", "partial"].includes(current.status) || !current.position) return fallback;
  const cache = await readWeatherCache(prisma, restaurantId);
  const forecast = cache?.forecast;
  if (!forecast || cache.failed || cache.provenance !== "live" || cache.positionRevision !== current.position.revision ||
      forecast.fetchedAt !== current.fetchedAt) return fallback;
  return { hasTerrace: restaurant.hasTerrace, forecast };
}
