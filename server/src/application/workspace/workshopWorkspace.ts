import type { Prisma } from "@prisma/client";
import { lockReceiptWorkspace } from "./receiptStock.js";
import { WorkspaceError } from "./workspaceError.js";

export const workshopDayKind = (date: string) => `workshop-day:v1:${date}`;

export async function lockWorkshopWorkspace(tx: Prisma.TransactionClient, restaurantId: string, allowOperationalTestWorkspace: boolean) {
  const mode = await lockReceiptWorkspace(tx, restaurantId);
  if (mode !== "demo" && !(mode === "operational" && allowOperationalTestWorkspace)) {
    throw new WorkspaceError(403, "DEMO_WORKSPACE_REQUIRED", "L’import exige un établissement de test autorisé.");
  }
}
