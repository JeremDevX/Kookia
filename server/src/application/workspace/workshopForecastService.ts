import type { Prisma } from "@prisma/client";
import { formatParisDate } from "../../../../shared/parisDate.js";
import { workshopForecastSchema, type WorkshopForecast } from "../../../../shared/workshopForecast.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./workspaceError.js";
import { lockWorkshopWorkspace, workshopDayKind } from "./workshopWorkspace.js";

const kind = "workshop-forecast:v1";

export async function storeWorkshopForecast(restaurantId: string, forecast: WorkshopForecast, allowOperationalTestWorkspace: boolean) {
  return prisma.$transaction(async tx => {
    await lockWorkshopWorkspace(tx, restaurantId, allowOperationalTestWorkspace);
    if (forecast.date !== formatParisDate()) {
      throw new WorkspaceError(400, "WORKSHOP_FORECAST_DATE", "La prévision doit concerner la journée en cours à Paris.");
    }
    const base = await tx.workspaceDocument.findUnique({
      where: { restaurantId_kind: { restaurantId, kind: workshopDayKind(forecast.basedOnDate) } }, select: { kind: true },
    });
    if (!base) {
      throw new WorkspaceError(409, "WORKSHOP_FORECAST_BASE_MISSING", "Synchronisez la veille avant de transmettre sa prévision.");
    }
    await tx.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind } },
      create: { restaurantId, kind, data: forecast }, update: { data: forecast } });
    return { date: forecast.date };
  });
}

export async function readWorkshopForecast(restaurantId: string, allowOperationalTestWorkspace: boolean,
  db: Prisma.TransactionClient = prisma, today = formatParisDate()): Promise<WorkshopForecast | null> {
  const document = await db.workspaceDocument.findFirst({ where: { restaurantId, kind,
    restaurant: { mode: { in: allowOperationalTestWorkspace ? ["demo", "operational"] : ["demo"] } },
  }, select: { data: true } });
  const result = workshopForecastSchema.safeParse(document?.data);
  return result.success && result.data.date === today ? result.data : null;
}
