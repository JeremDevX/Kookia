import { Router } from "express";
import { z } from "zod";
import { getOperationalReport } from "../application/workspace/reportService.js";
import { workspaceContext } from "./workspaceContext.js";

export const reportRoutes = Router();
reportRoutes.get("/report", async (req, res) => {
  const { from, to } = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine((range) => range.from <= range.to).parse(req.query);
  const restaurantId = workspaceContext(res).restaurantId;
  res.json(await getOperationalReport(restaurantId, from, to));
});
