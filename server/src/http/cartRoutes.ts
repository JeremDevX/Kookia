import { Router, type Response } from "express";
import { cartMutationSchema, getCart, mutateCart } from "../application/workspace/cartService.js";
export const cartRoutes = Router();
const restaurantId = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
cartRoutes.get("/cart", async (_req, res, next) => {
  try { res.json(await getCart(restaurantId(res))); } catch (error) { next(error); }
});
cartRoutes.post("/cart", async (req, res, next) => {
  try { res.json(await mutateCart(restaurantId(res), cartMutationSchema.parse(req.body))); } catch (error) { next(error); }
});
