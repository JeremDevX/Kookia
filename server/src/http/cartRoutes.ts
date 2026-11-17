import { Router } from "express";
import { cartMutationSchema, getCart, mutateCart } from "../application/workspace/cartService.js";
import { workspaceContext } from "./workspaceContext.js";
export const cartRoutes = Router();
cartRoutes.get("/cart", async (_req, res) => {
  res.json(await getCart(workspaceContext(res).restaurantId));
});
cartRoutes.post("/cart", async (req, res) => {
  res.json(await mutateCart(workspaceContext(res).restaurantId, cartMutationSchema.parse(req.body)));
});
