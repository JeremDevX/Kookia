import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { formatParisDate } from "../../../shared/parisDate.js";
import { WorkspaceError } from "../application/workspace/workspaceError.js";
import { importWorkshopDay } from "../application/workspace/workshopImportService.js";
import { workshopStockSchema } from "../application/workspace/workshopStockInput.js";

const sale = z.strictObject({
  name: z.string().trim().min(1).max(120).refine(value => !/\p{Cc}/u.test(value)),
  quantity: z.number().int().min(1).max(1_000_000),
}).transform(({ name, quantity }) => ({ name, quantity, normalizedName: name.toLocaleLowerCase("fr-FR") }));

const serviceDay = z.strictObject({ open: z.boolean(), sales: z.array(sale).max(25), stock: workshopStockSchema.optional() })
  .refine(day => day.open || day.sales.length === 0)
  .refine(day => new Set(day.sales.map(item => item.normalizedName)).size === day.sales.length);
const serviceDate = z.iso.date().refine(date => date >= "0001-01-01");
const tokenDigest = (token: string) => createHash("sha256").update(token).digest();

export function createWorkshopImportRoutes(token: string, restaurantId: string, allowOperationalTestWorkspace: boolean) {
  const routes = Router();
  const expected = tokenDigest(token);

  routes.put("/days/:date", async (req, res) => {
    const supplied = /^Bearer (\S+)$/i.exec(req.get("authorization") ?? "")?.[1] ?? "";
    if (!timingSafeEqual(tokenDigest(supplied), expected)) {
      res.set("WWW-Authenticate", 'Bearer realm="kookia-workshop"').status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Accès à l’import de l’atelier refusé." },
      });
      return;
    }

    const date = serviceDate.safeParse(req.params.date);
    const day = serviceDay.safeParse(req.body);
    if (!date.success || !day.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données de la journée sont invalides." } });
      return;
    }
    if (date.data > formatParisDate()) {
      res.status(400).json({ error: { code: "FUTURE_SERVICE_DATE", message: "La date de service ne peut pas être future." } });
      return;
    }
    if (day.data.stock?.some(({ lots }) => lots.some(({ openingMilli, closingMilli, lossMilli, receivedOn, expiresOn }) =>
      (openingMilli > 0 ? receivedOn >= date.data : receivedOn !== date.data)
      || (expiresOn < date.data && (closingMilli !== 0 || lossMilli !== openingMilli))))) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "L’état des lots ne correspond pas à cette date de service." } });
      return;
    }
    try {
      res.json(await importWorkshopDay(restaurantId, date.data, day.data, allowOperationalTestWorkspace));
    } catch (error) {
      if (!(error instanceof WorkspaceError)) throw error;
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
  });

  return routes;
}
