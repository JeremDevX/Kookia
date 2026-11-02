import { z } from "zod";

export const restaurantSchema = z.object({
  name: z.string().trim().min(1).max(120), type: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300), city: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40), email: z.email().max(254), dailyCovers: z.number().int().min(0).max(100000),
  hasTerrace: z.boolean().nullable().optional(),
}).strict();
