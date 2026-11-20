import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { WorkspaceError } from "./workspaceError.js";
import type { WorkshopOperationsInput } from "./workshopOperationsInput.js";
import { applyWorkshopPurchases } from "./workshopPurchases.js";
import { applyWorkshopKitchen, linkWorkshopRawLosses } from "./workshopKitchen.js";
import { applyWorkshopServiceViews } from "./workshopServiceViews.js";

export const workshopOperationsKind = (date: string) => `workshop-operations:v1:${date}`;

export async function applyWorkshopOperations(tx: Prisma.TransactionClient, restaurantId: string,
  date: string, operations: WorkshopOperationsInput, connected = false) {
  const kind = workshopOperationsKind(date);
  const digest = createHash("sha256").update(JSON.stringify(operations)).digest("hex");
  const prior = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
  if (prior) {
    const data = prior.data;
    const legacy = { ...operations, losses: operations.losses.map(loss => ({ ...loss, supplier: undefined })) };
    const legacyDigest = createHash("sha256").update(JSON.stringify(legacy)).digest("hex");
    if (data && typeof data === "object" && !Array.isArray(data) && (data.digest === digest || data.digest === legacyDigest)) {
      await linkWorkshopRawLosses(tx, restaurantId, date, operations.losses);
      return;
    }
    throw new WorkspaceError(409, "WORKSHOP_OPERATIONS_CHANGED", "Les opérations de l’atelier de cette journée ont déjà été enregistrées avec d’autres valeurs.");
  }

  await applyWorkshopServiceViews(tx, restaurantId, new Date(`${date}T00:00:00.000Z`), operations, kind);
  await applyWorkshopPurchases(tx, restaurantId, date, operations.purchases, connected);
  await applyWorkshopKitchen(tx, restaurantId, date, operations);
  await tx.workspaceDocument.create({ data: { restaurantId, kind,
    data: { digest, incident: operations.incident, events: operations.events,
      services: operations.services.map(({ slot, covers }) => ({ slot, covers })) } } });
}
