import { isDeepStrictEqual } from "node:util";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { addCalendarDays } from "../../../../shared/calendarDate.js";
import { formatParisDate, formatParisTime } from "../../../../shared/parisDate.js";
import { workshopRunEventSchema, workshopSettingsInputSchema, workshopSettingsSchema, workshopWeeklyServiceSchema,
  type WorkshopControl, type WorkshopRun,
  type WorkshopRunEvent, type WorkshopRunnerControl, type WorkshopSettings } from "../../../../shared/workshopControl.js";
import { workshopPurchaseNeedsModel } from "../../../../shared/workshopForecast.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { simulationActor } from "./operationProvenance.js";
import { getPurchaseSuggestions } from "./purchaseSuggestionService.js";
import { readWorkshopForecast } from "./workshopForecastService.js";
import { workshopOperationsKind } from "./workshopOperationsService.js";
import { workshopStockKind } from "./workshopStockService.js";
import { lockWorkshopWorkspace, workshopDayKind } from "./workshopWorkspace.js";
import { WorkspaceError } from "./workspaceError.js";

export interface WorkshopControlScope {
  restaurantId: string;
  allowOperationalTestWorkspace: boolean;
  forecastEnabled: boolean;
  followOrdersFrom?: string;
  scheduleTime?: string;
}

const settingsKind = "workshop-control-settings:v1";
const runtimeKind = "workshop-control-run:v1";
const runTimeoutMinutes = 30;
const runTimeoutMs = runTimeoutMinutes * 60_000;
const settingsSchema = z.array(workshopSettingsSchema.extend({
  revision: z.number().int().min(1), effectiveFrom: z.iso.date(),
}));
const defaultSettings: WorkshopSettings = { covers: 40, incidentEvery: 3, effectiveFrom: null, revision: 0 };
const runtimeSchema = z.union([
  z.object({
    event: workshopRunEventSchema,
    startedAt: z.iso.datetime(), finishedAt: z.iso.datetime().nullable(),
    lastHeartbeatAt: z.iso.datetime(), retryRequested: z.boolean(),
  }),
  z.strictObject({ event: z.null(), retryRequested: z.literal(true) }),
]);
type Runtime = z.infer<typeof runtimeSchema>;

function readDocument(db: Prisma.TransactionClient, restaurantId: string, kind: string) {
  return db.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } }, select: { data: true } });
}

function writeDocument(db: Prisma.TransactionClient, restaurantId: string, kind: string, data: Prisma.InputJsonValue) {
  return db.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind } },
    create: { restaurantId, kind, data }, update: { data } });
}

async function readSettings(db: Prisma.TransactionClient, restaurantId: string) {
  const document = await readDocument(db, restaurantId, settingsKind);
  return document ? settingsSchema.parse(document.data) : [];
}

async function readRuntime(db: Prisma.TransactionClient, restaurantId: string) {
  const document = await readDocument(db, restaurantId, runtimeKind);
  return document ? runtimeSchema.parse(document.data) : null;
}

function currentRun(runtime: Runtime | null, now: Date): WorkshopRun | null {
  if (!runtime?.event) return null;
  const { event, startedAt, finishedAt, lastHeartbeatAt } = runtime;
  const leaseEnds = Date.parse(lastHeartbeatAt) + runTimeoutMs;
  if (event.state === "running" && leaseEnds <= now.getTime()) {
    return { ...event, state: "failed", issue: { code: "INTERRUPTED", product: null, status: null },
      startedAt, finishedAt: new Date(leaseEnds).toISOString() };
  }
  return { ...event, startedAt, finishedAt };
}

function missedTransferDate(scheduleTime: string | undefined, lastConfirmedDate: string | null, run: WorkshopRun | null, now: Date) {
  if (!scheduleTime || !lastConfirmedDate || (run && run.state !== "succeeded")) return null;
  const [hour, minute] = formatParisTime(now).split(":").map(Number);
  const [scheduledHour, scheduledMinute] = scheduleTime.split(":").map(Number);
  const elapsed = (hour - scheduledHour) * 60 + minute - scheduledMinute;
  const minutesSinceSchedule = (elapsed + 1440) % 1440;
  const lastDue = addCalendarDays(formatParisDate(now), (elapsed < 0 ? -2 : -1) - Number(minutesSinceSchedule < runTimeoutMinutes));
  return lastConfirmedDate < lastDue ? addCalendarDays(lastConfirmedDate, 1) : null;
}

export async function readWorkshopControlRestaurant({ restaurantId, allowOperationalTestWorkspace }: WorkshopControlScope) {
  const restaurant = await prisma.restaurant.findFirst({ where: { id: restaurantId,
    mode: { in: allowOperationalTestWorkspace ? ["demo", "operational"] : ["demo"] },
  }, select: { name: true, mode: true, city: true, hasTerrace: true, serviceSchedules: {
    select: { weekday: true, slot: true, opensAt: true, closesAt: true },
    orderBy: [{ weekday: "asc" }, { slot: "asc" }],
  } } });
  if (!restaurant) throw new WorkspaceError(404, "WORKSHOP_NOT_CONFIGURED", "L’atelier n’est pas configuré pour cet établissement.");
  const { serviceSchedules, ...identity } = restaurant;
  return { ...identity, weeklyServices: z.array(workshopWeeklyServiceSchema).parse(serviceSchedules) };
}

async function readHistory(restaurantId: string): Promise<WorkshopControl["history"]> {
  const prefix = workshopDayKind("");
  const days = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: prefix } },
    select: { kind: true, updatedAt: true }, orderBy: { kind: "desc" }, take: 30 });
  if (!days.length) return [];
  const dates = days.map(({ kind }) => kind.slice(prefix.length));
  const companions = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: {
    in: dates.flatMap(date => [workshopStockKind(date), workshopOperationsKind(date)]),
  } }, select: { kind: true } });
  const kinds = new Set(companions.map(({ kind }) => kind));
  return days.map(({ updatedAt }, index) => {
    const date = dates[index];
    return { date, confirmedAt: updatedAt.toISOString(), stock: kinds.has(workshopStockKind(date)), operations: kinds.has(workshopOperationsKind(date)) };
  });
}

async function readPurchases(restaurantId: string, mode: WorkshopControl["restaurant"]["mode"], followValidated: boolean,
  now: Date): Promise<WorkshopControl["purchases"]> {
  if (mode === "demo" && !followValidated) return { followValidated, suggestions: [], orders: [], receipts: [] };
  const suggestionDecision = { restaurantId, decision: "purchase_suggestion_added" };
  const pendingStatuses = followValidated ? ["simulated", "simulated_partially_received"] : ["validated", "partially_received"];
  const [result, pendingLines, receivedLines] = await Promise.all([
    getPurchaseSuggestions(restaurantId, prisma, now),
    prisma.purchaseOrderLine.findMany({ where: { restaurantId,
      ...(followValidated && { suggestionDecision }),
      order: { status: { in: pendingStatuses } },
    }, select: { id: true, orderId: true, productName: true, supplierName: true, unit: true, quantity: true,
      expectedDeliveryDate: true, receiptLines: { select: { receivedQuantity: true } },
    }, orderBy: [{ expectedDeliveryDate: { sort: "asc", nulls: "last" } }, { order: { createdAt: "desc" } }, { id: "asc" }] }),
    followValidated ? prisma.purchaseReceiptLine.findMany({ where: { restaurantId,
      orderLine: { suggestionDecision },
      receipt: { simulated: true, provenance: "demo_simulation", actorId: simulationActor },
    }, select: { id: true, productName: true, unit: true, receivedQuantity: true,
      receipt: { select: { orderId: true, deliveryDate: true } }, orderLine: { select: { supplierName: true } },
      movement: { select: { id: true } },
    }, orderBy: [{ receipt: { deliveryDate: "desc" } }, { id: "desc" }], take: 12 }) : [],
  ]);
  const suggestions = (!followValidated || result.model === workshopPurchaseNeedsModel) ? result.suggestions.flatMap(row =>
    row.canAdd && !row.decision && row.estimatedQuantity !== null
      ? [{ name: row.productName, quantity: row.estimatedQuantity, unit: row.unit }] : []) : [];
  const orders = pendingLines.flatMap(line => {
    const remaining = line.receiptLines.reduce((total, receipt) => total.minus(receipt.receivedQuantity), line.quantity).toNumber();
    return remaining > 0 ? [{ id: line.id, orderId: line.orderId, name: line.productName, supplier: line.supplierName, ordered: line.quantity.toNumber(),
      remaining, unit: line.unit, expectedDate: line.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null }] : [];
  }).slice(0, 15);
  const receipts = receivedLines.map(line => ({ id: line.id, orderId: line.receipt.orderId,
    date: line.receipt.deliveryDate.toISOString().slice(0, 10), name: line.productName, supplier: line.orderLine.supplierName,
    quantity: line.receivedQuantity.toNumber(), unit: line.unit, stockMovementId: line.movement?.id ?? null }));
  return { followValidated, suggestions, orders, receipts };
}

export async function getWorkshopControl(scope: WorkshopControlScope, canManage: boolean): Promise<WorkshopControl> {
  const restaurant = await readWorkshopControlRestaurant(scope);
  const { restaurantId, forecastEnabled, allowOperationalTestWorkspace, followOrdersFrom, scheduleTime } = scope;
  const now = new Date();
  const today = formatParisDate(now);
  const [settings, runtime, history, forecast, purchases] = await Promise.all([
    readSettings(prisma, restaurantId), readRuntime(prisma, restaurantId), readHistory(restaurantId),
    forecastEnabled ? readWorkshopForecast(restaurantId, allowOperationalTestWorkspace, prisma, today) : null,
    readPurchases(restaurantId, restaurant.mode, restaurant.mode === "demo" && Boolean(followOrdersFrom && followOrdersFrom <= today), now),
  ]);
  const lastRun = currentRun(runtime, now);
  const retryRequested = runtime?.retryRequested ?? false;
  const nextRun = scheduleTime
    ? { date: formatParisTime(now) >= scheduleTime ? addCalendarDays(today, 1) : today, time: scheduleTime } : null;
  const lastConfirmedDate = history[0]?.date ?? null;
  const missedDate = missedTransferDate(scheduleTime, lastConfirmedDate, lastRun, now);
  return { restaurant, canManage, settings: settings.at(-1) ?? defaultSettings, history, forecast, purchases,
    transfer: { lastConfirmedDate, lastConfirmedAt: history[0]?.confirmedAt ?? null, nextRun, lastRun, missedDate,
      retryRequested, canRetry: canManage && Boolean(lastRun?.state === "failed" || missedDate) && !retryRequested } };
}

export async function getWorkshopRunnerControl(scope: WorkshopControlScope): Promise<WorkshopRunnerControl> {
  const { weeklyServices } = await readWorkshopControlRestaurant(scope);
  const [settings, runtime] = await Promise.all([readSettings(prisma, scope.restaurantId), readRuntime(prisma, scope.restaurantId)]);
  return { weeklyServices, settings, retryRequested: runtime?.retryRequested ?? false };
}

export function saveWorkshopSettings(scope: WorkshopControlScope, input: z.infer<typeof workshopSettingsInputSchema>): Promise<WorkshopSettings> {
  return prisma.$transaction(async tx => {
    const { restaurantId, allowOperationalTestWorkspace } = scope;
    await lockWorkshopWorkspace(tx, restaurantId, allowOperationalTestWorkspace);
    const timeline = await readSettings(tx, restaurantId);
    const current = timeline.at(-1) ?? defaultSettings;
    if (input.expectedRevision !== current.revision) {
      throw new WorkspaceError(409, "WORKSHOP_SETTINGS_CHANGED", "Les réglages ont changé. Rechargez la page avant de modifier l’atelier.");
    }
    const effectiveFrom = addCalendarDays(formatParisDate(), 1);
    const settings = { covers: input.covers, incidentEvery: input.incidentEvery, revision: current.revision + 1, effectiveFrom };
    await writeDocument(tx, restaurantId, settingsKind, [...timeline.filter(version => version.effectiveFrom < effectiveFrom), settings]);
    return settings;
  }, { timeout: 20_000 });
}

export function queueWorkshopRetry(scope: WorkshopControlScope) {
  return prisma.$transaction(async tx => {
    const { restaurantId, allowOperationalTestWorkspace } = scope;
    await lockWorkshopWorkspace(tx, restaurantId, allowOperationalTestWorkspace);
    const runtime = await readRuntime(tx, restaurantId);
    const now = new Date();
    const run = currentRun(runtime, now);
    let retryAvailable = run?.state === "failed";
    if ((!run || run.state === "succeeded") && scope.scheduleTime) {
      const prefix = workshopDayKind("");
      const latest = await tx.workspaceDocument.findFirst({ where: { restaurantId, kind: { startsWith: prefix } },
        select: { kind: true }, orderBy: { kind: "desc" } });
      retryAvailable = missedTransferDate(scope.scheduleTime, latest?.kind.slice(prefix.length) ?? null, run, now) !== null;
    }
    if (!retryAvailable) {
      throw new WorkspaceError(409, "WORKSHOP_RETRY_UNAVAILABLE", "Aucun transfert interrompu ou en échec à relancer.");
    }
    if (!runtime?.retryRequested) await writeDocument(tx, restaurantId, runtimeKind, { ...runtime, event: runtime?.event ?? null, retryRequested: true });
    return { queued: true as const };
  }, { timeout: 20_000 });
}

export function recordWorkshopRun(scope: WorkshopControlScope, event: WorkshopRunEvent) {
  return prisma.$transaction(async tx => {
    const { restaurantId, allowOperationalTestWorkspace } = scope;
    await lockWorkshopWorkspace(tx, restaurantId, allowOperationalTestWorkspace);
    const runtime = await readRuntime(tx, restaurantId);
    const now = new Date();
    const stamp = now.toISOString();
    const current = currentRun(runtime, now);
    const sameRun = runtime?.event?.id === event.id;
    if (event.date && event.date > formatParisDate(now)) {
      throw new WorkspaceError(400, "WORKSHOP_RUN_DATE", "Ce transfert indique une journée future.");
    }

    if (event.state === "running" && !sameRun) {
      if (current?.state === "running") {
        throw new WorkspaceError(409, "WORKSHOP_RUN_IN_PROGRESS", "Un transfert de l’atelier est déjà en cours.");
      }
      await writeDocument(tx, restaurantId, runtimeKind, { event, startedAt: stamp, finishedAt: null,
        lastHeartbeatAt: stamp, retryRequested: false });
    } else if (sameRun && runtime?.event && current?.state === "running") {
      await writeDocument(tx, restaurantId, runtimeKind, { ...runtime, event, lastHeartbeatAt: stamp,
        finishedAt: event.state === "running" ? null : stamp });
    } else if (!sameRun || !runtime || event.state === "running" || !isDeepStrictEqual(runtime.event, event)) {
      throw new WorkspaceError(409, "WORKSHOP_RUN_CHANGED", "Ce transfert de l’atelier est terminé ou a été remplacé.");
    }
    return { ok: true as const };
  }, { timeout: 20_000 });
}
