import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./workspaceError.js";
import { simulationActor } from "./operationProvenance.js";
import { qualifiedAllocation, serviceSlots, type CalendarService, type ServiceSlot, type SalesCoverage } from "../../../../shared/serviceCalendar.js";

const date = (value: string) => new Date(`${value}T00:00:00Z`);
const conflict = () => new WorkspaceError(409, "REVISION_CONFLICT", "Ces données ont changé. Rechargez avant de valider.");
async function lock(tx: Prisma.TransactionClient, restaurantId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
}

export async function getWeeklyServices(restaurantId: string) {
  return prisma.restaurantServiceSchedule.findMany({ where: { restaurantId },
    select: { weekday: true, slot: true, opensAt: true, closesAt: true, revision: true }, orderBy: [{ weekday: "asc" }, { slot: "asc" }] });
}

export async function saveWeeklyService(restaurantId: string, actorId: string, input: {
  weekday: number; slot: ServiceSlot; opensAt: string; closesAt: string; expectedRevision: number; open: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, restaurantId);
    const where = { restaurantId_weekday_slot: { restaurantId, weekday: input.weekday, slot: input.slot } };
    const current = await tx.restaurantServiceSchedule.findUnique({ where });
    if ((current?.revision ?? 0) !== input.expectedRevision) throw conflict();
    if (!input.open) { if (current) await tx.restaurantServiceSchedule.delete({ where }); return null; }
    const data = { opensAt: input.opensAt, closesAt: input.closesAt, actorId };
    return current ? tx.restaurantServiceSchedule.update({ where, data: { ...data, revision: { increment: 1 } } }) :
      tx.restaurantServiceSchedule.create({ data: { restaurantId, weekday: input.weekday, slot: input.slot, ...data } });
  });
}

export async function getServiceCalendar(restaurantId: string, from: string, to: string) {
  const range = { gte: date(from), lte: date(to) };
  const [weekly, sessions, sales] = await Promise.all([
    getWeeklyServices(restaurantId), prisma.restaurantServiceSession.findMany({ where: { restaurantId, serviceDate: range } }),
    prisma.dailySale.findMany({ where: { restaurantId, serviceDate: range }, select: {
      serviceDate: true, source: true, quantity: true, revision: true,
      serviceAllocation: { select: { lunchQuantity: true, dinnerQuantity: true, saleRevision: true } },
    } }),
  ]);
  const sessionsBySlot = new Map(sessions.map((session) => [`${session.serviceDate.getTime()}:${session.slot}`, session]));
  const emptyDay = { lunchQuantity: 0, dinnerQuantity: 0, unallocatedQuantity: 0, allocationNeedsReview: false,
    hasIncompleteAllocation: false, excludedSimulationQuantity: 0, simulatedLunchQuantity: 0, simulatedDinnerQuantity: 0 };
  const salesByDay = new Map<number, typeof emptyDay>();
  for (const sale of sales) {
    const timestamp = sale.serviceDate.getTime();
    const summary = salesByDay.get(timestamp) ?? { ...emptyDay };
    salesByDay.set(timestamp, summary);
    const allocation = qualifiedAllocation(sale, sale.serviceAllocation);
    if (sale.source === "demo_simulation") {
      summary.excludedSimulationQuantity += sale.quantity;
      summary.simulatedLunchQuantity += allocation.lunchQuantity;
      summary.simulatedDinnerQuantity += allocation.dinnerQuantity;
      continue;
    }
    summary.lunchQuantity += allocation.lunchQuantity;
    summary.dinnerQuantity += allocation.dinnerQuantity;
    summary.unallocatedQuantity += allocation.unallocatedQuantity;
    summary.allocationNeedsReview ||= allocation.needsReview;
    summary.hasIncompleteAllocation ||= allocation.needsReview || allocation.unallocatedQuantity > 0;
  }
  const result: CalendarService[] = [];
  const end = range.lte.getTime();
  for (let timestamp = range.gte.getTime(); timestamp <= end; timestamp += 86_400_000) {
    const currentDate = new Date(timestamp), serviceDate = currentDate.toISOString().slice(0, 10);
    const { lunchQuantity, dinnerQuantity, unallocatedQuantity, allocationNeedsReview, hasIncompleteAllocation,
      excludedSimulationQuantity, simulatedLunchQuantity, simulatedDinnerQuantity } = salesByDay.get(timestamp) ?? emptyDay;
    for (const slot of serviceSlots) {
      const schedule = weekly.find((entry) => entry.weekday === currentDate.getUTCDay() && entry.slot === slot);
      const session = sessionsBySlot.get(`${timestamp}:${slot}`);
      result.push({ serviceDate, slot, plannedOpen: session?.plannedOpen ?? Boolean(schedule),
        opensAt: schedule?.opensAt ?? null, closesAt: schedule?.closesAt ?? null, exceptional: Boolean(session),
        coverage: session?.coverage === "complete" && hasIncompleteAllocation
          ? "partial" : session?.coverage ?? "missing", actualCovers: session?.actualCovers ?? null,
        note: session?.note ?? "", revision: session?.revision ?? 0,
        soldQuantity: slot === "lunch" ? lunchQuantity : dinnerQuantity,
        ...(session?.actorId === simulationActor && { simulated: true,
          simulatedSoldQuantity: slot === "lunch" ? simulatedLunchQuantity : simulatedDinnerQuantity }),
        unallocatedQuantity, allocationNeedsReview, excludedSimulationQuantity });
    }
  }
  return result;
}

export async function saveCalendarService(restaurantId: string, actorId: string, input: {
  serviceDate: string; slot: ServiceSlot; plannedOpen: boolean; coverage: SalesCoverage; actualCovers: number | null;
  note: string; expectedRevision: number;
}) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, restaurantId);
    const where = { restaurantId_serviceDate_slot: { restaurantId, serviceDate: date(input.serviceDate), slot: input.slot } };
    const current = await tx.restaurantServiceSession.findUnique({ where });
    if ((current?.revision ?? 0) !== input.expectedRevision) throw conflict();
    if (!input.plannedOpen) {
      const sales = await tx.dailySale.findMany({ where: { restaurantId, serviceDate: date(input.serviceDate) }, include: { serviceAllocation: true } });
      const sold = sales.some(sale => {
        const assignment = qualifiedAllocation(sale, sale.serviceAllocation);
        return (input.slot === "lunch" ? assignment.lunchQuantity : assignment.dinnerQuantity) > 0;
      });
      if ((input.actualCovers ?? 0) > 0 || sold)
        throw new WorkspaceError(409, "CLOSED_SERVICE_HAS_ACTIVITY", "Ce service a des ventes attribuées ou des couverts observés. Déclarez-le ouvert avant de conserver ces observations.");
    }
    const { expectedRevision: _revision, ...values } = input;
    void _revision;
    const data = { ...values, serviceDate: date(input.serviceDate), actorId: current?.actorId === simulationActor ? simulationActor : actorId };
    return current ? tx.restaurantServiceSession.update({ where, data: { ...data, revision: { increment: 1 } } }) :
      tx.restaurantServiceSession.create({ data: { ...data, restaurantId } });
  });
}

export async function getSaleAllocation(restaurantId: string, saleId: string) {
  const sale = await prisma.dailySale.findUnique({ where: { restaurantId_id: { restaurantId, id: saleId } }, include: { serviceAllocation: true } });
  if (!sale) throw new WorkspaceError(404, "NOT_FOUND", "Vente introuvable.");
  return { saleId, ...qualifiedAllocation(sale, sale.serviceAllocation), revision: sale.serviceAllocation?.revision ?? 0,
    saleRevision: sale.revision, previousLunchQuantity: sale.serviceAllocation?.lunchQuantity ?? 0,
    previousDinnerQuantity: sale.serviceAllocation?.dinnerQuantity ?? 0 };
}

export async function saveSaleAllocation(restaurantId: string, actorId: string, saleId: string, input: {
  lunchQuantity: number; dinnerQuantity: number; expectedRevision: number; expectedSaleRevision: number;
}) {
  await prisma.$transaction(async (tx) => {
    await lock(tx, restaurantId);
    const sale = await tx.dailySale.findUnique({ where: { restaurantId_id: { restaurantId, id: saleId } }, include: { serviceAllocation: true } });
    if (!sale) throw new WorkspaceError(404, "NOT_FOUND", "Vente introuvable.");
    if (sale.revision !== input.expectedSaleRevision || (sale.serviceAllocation?.revision ?? 0) !== input.expectedRevision) throw conflict();
    if (input.lunchQuantity + input.dinnerQuantity > sale.quantity)
      throw new WorkspaceError(400, "INVALID_ALLOCATION", "La ventilation ne peut pas dépasser les ventes enregistrées.");
    const where = { restaurantId_saleId: { restaurantId, saleId } };
    const data = { lunchQuantity: input.lunchQuantity, dinnerQuantity: input.dinnerQuantity, saleRevision: sale.revision, actorId };
    await tx.saleServiceAllocation.upsert({ where, create: { restaurantId, saleId, ...data }, update: { ...data, revision: { increment: 1 } } });
    for (const slot of serviceSlots) {
      const key = { restaurantId_serviceDate_slot: { restaurantId, serviceDate: sale.serviceDate, slot } };
      const session = await tx.restaurantServiceSession.findUnique({ where: key });
      if (session && !session.plannedOpen && (slot === "lunch" ? input.lunchQuantity : input.dinnerQuantity) > 0)
        throw new WorkspaceError(409, "SERVICE_PLANNED_CLOSED", "Ce service est déclaré fermé. Déclarez-le ouvert avant de lui attribuer des ventes.");
      if (session?.coverage === "complete") await tx.restaurantServiceSession.update({ where: key, data: { coverage: "partial", revision: { increment: 1 }, actorId } });
    }
  });
  return getSaleAllocation(restaurantId, saleId);
}
