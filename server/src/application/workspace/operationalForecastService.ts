import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "../../infrastructure/database/prisma.js";
import { qualifiedAllocation, serviceSlots } from "../../../../shared/serviceCalendar.js";
import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { MenuEntry } from "../../../../shared/serviceOperations.js";
import type { ForecastIngredient, ForecastService, OperationalForecast } from "../../../../shared/operationalForecast.js";
import { forecastMenuEntry, projectMenuIngredients, type ServiceObservation } from "./operationalForecastPolicy.js";
import { WorkspaceError } from "./catalogService.js";

type Database = PrismaClient | Prisma.TransactionClient;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
const offset = (value: string, n: number) => iso(new Date(Date.parse(value) + n * 86400000));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export async function getOperationalForecast(restaurantId: string, fromDate: string, throughDate: string,
  db: Database = prisma, asOfDate = offset(today(), -1)): Promise<OperationalForecast> {
  if (fromDate <= asOfDate || throughDate < fromDate || Date.parse(throughDate) - Date.parse(fromDate) > 90 * 86400000)
    throw new WorkspaceError(400, "INVALID_FORECAST_RANGE", "La prévision doit suivre la date d'observation et couvrir au plus 90 jours.");
  // Analysis window, not a limit on the restaurant's retained history.
  const since = offset(asOfDate, -1095), knownBefore = new Date();
  const [restaurant, weekly, sessions, sales, menus] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { mode: true } }),
    db.restaurantServiceSchedule.findMany({ where: { restaurantId } }),
    db.restaurantServiceSession.findMany({ where: { restaurantId, serviceDate: { gte: date(since), lte: date(throughDate) } } }),
    db.dailySale.findMany({ where: { restaurantId, serviceDate: { gte: date(since), lte: date(asOfDate) } }, include: { serviceAllocation: true } }),
    db.serviceMenuVersion.findMany({ where: { restaurantId, serviceDate: { gte: date(since), lte: date(throughDate) } }, orderBy: { revision: "desc" } }),
  ]);
  const menuAt = (day: string, slot: ServiceSlot, historical = false) => menus.find(m => iso(m.serviceDate) === day && m.slot === slot && (!historical || m.createdAt < knownBefore));
  const history: ServiceObservation[] = [], qualifiedDays = new Set<string>();
  let excludedServices = 0;
  for (const session of sessions.filter(s => iso(s.serviceDate) <= asOfDate)) {
    const day = iso(session.serviceDate), slot = session.slot as ServiceSlot;
    const rows = sales.filter(s => iso(s.serviceDate) === day);
    const invalid = rows.some(s => s.source === "demo_simulation" || s.updatedAt >= knownBefore || !s.serviceAllocation ||
      s.serviceAllocation.updatedAt >= knownBefore || qualifiedAllocation(s, s.serviceAllocation).needsReview || qualifiedAllocation(s, s.serviceAllocation).unallocatedQuantity > 0);
    if (restaurant.mode !== "operational" || !session.plannedOpen || session.coverage !== "complete" || session.updatedAt >= knownBefore || invalid) { excludedServices++; continue; }
    qualifiedDays.add(`${day}:${slot}`);
    const historicalMenu = menuAt(day, slot, true);
    const offered = (historicalMenu?.entries as unknown as MenuEntry[] | undefined)?.filter(e => e.available && e.saleItemId) ?? [];
    const ids = new Set([...offered.map(e => e.saleItemId!), ...rows.filter(s => (slot === "lunch" ? s.serviceAllocation?.lunchQuantity : s.serviceAllocation?.dinnerQuantity)).map(s => s.saleItemId)]);
    for (const saleItemId of ids) {
      const row = rows.find(s => s.saleItemId === saleItemId);
      history.push({ date: day, slot, saleItemId, quantity: row ? slot === "lunch" ? row.serviceAllocation!.lunchQuantity : row.serviceAllocation!.dinnerQuantity : 0 });
    }
  }
  const services: ForecastService[] = [], totals = new Map<string, ForecastIngredient>();
  for (let day = fromDate; day <= throughDate; day = offset(day, 1)) for (const slot of serviceSlots) {
    const session = sessions.find(s => iso(s.serviceDate) === day && s.slot === slot);
    const open = session?.plannedOpen ?? weekly.some(w => w.weekday === date(day).getUTCDay() && w.slot === slot);
    const menu = menuAt(day, slot), entries = (menu?.entries as unknown as MenuEntry[] | undefined) ?? [];
    const blockers: string[] = [];
    if (!weekly.length && !session) blockers.push("Horaires de service non renseignés.");
    if (open && !menu) blockers.push("Carte du service non renseignée.");
    if (restaurant.mode !== "operational") blockers.push("Espace de démonstration : aucune prévision mesurée.");
    const items = open ? entries.filter(e => e.available).map(e => forecastMenuEntry(e, day, slot, history)) : [];
    for (const item of items) if (item.quantity === null) blockers.push(`${item.name} : correspondance de vente ou historique qualifié insuffisant.`);
    const projection = projectMenuIngredients(entries, items);
    blockers.push(...projection.blockers);
    for (const need of projection.ingredients) {
      const previous = totals.get(need.productId);
      if (previous && previous.unit !== need.unit) { blockers.push(`${need.productName} : unité modifiée entre services.`); continue; }
      totals.set(need.productId, previous ? { ...previous, quantity: Math.round((previous.quantity + need.quantity) * 1000) / 1000,
        sources: [...previous.sources, ...need.sources] } : need);
    }
    const mix = ["Entrée", "Plat", "Dessert", "Boisson"].flatMap(category => {
      let portions = 0, covers = 0, count = 0;
      for (const s of sessions.filter(s => s.slot === slot && s.actualCovers !== null && s.actualCovers > 0 && qualifiedDays.has(`${iso(s.serviceDate)}:${slot}`))) {
        const historicalEntries = menuAt(iso(s.serviceDate), slot, true)?.entries as unknown as MenuEntry[] | undefined;
        if (!historicalEntries) continue;
        covers += s.actualCovers!; count++;
        for (const e of historicalEntries) for (const c of e.components.filter(c => c.category === category))
          portions += (history.find(h => h.date === iso(s.serviceDate) && h.slot === slot && h.saleItemId === e.saleItemId)?.quantity ?? 0) * c.portions;
      }
      return count >= 4 && covers ? [{ category, portionsPerCover: Math.round(portions / covers * 1000) / 1000, observedCovers: covers, services: count }] : [];
    });
    const forecastKey = createHash("sha256").update(JSON.stringify({ date: day, slot, menuId: menu?.id ?? null, items, blockers })).digest("hex");
    services.push({ date: day, slot, plannedOpen: open, menuRevision: menu?.revision ?? 0, forecastKey, items, ingredientNeeds: projection.ingredients, blockers, mix });
  }
  return { fromDate, throughDate, asOfDate, provenance: restaurant.mode === "demo" ? "demo_simulation" : "recorded_sales",
    services, ingredientNeeds: [...totals.values()], blockers: services.flatMap(s => s.blockers.map(b => `${s.date} ${s.slot === "lunch" ? "midi" : "soir"} : ${b}`)), excludedServices,
    assumptions: ["Estimations, sans mouvement de stock ni validation de préparation.",
      "Services complets et ventes ventilées uniquement ; jours absents, ventes corrigées non revues et simulations exclus.",
      "Même jour/service : au moins 4 observations ; repli service : au moins 8. Saison : 8 observations comparables sur au moins 2 années.",
      "Dispersion observée, pas un intervalle de confiance. Aucune précision terrain revendiquée.",
      "Fenêtre d'analyse de trois ans ; l'historique conservé n'est pas limité."] };
}
