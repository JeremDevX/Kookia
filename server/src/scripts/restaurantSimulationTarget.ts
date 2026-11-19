import { findLocalCamilleRestaurant } from "../application/workspace/localCamilleWorkspace.js";

export async function resolveCamilleRestaurantId() {
  const target = await findLocalCamilleRestaurant();
  if (!target) throw new Error("Espace local Camille non déterminable de façon unique par ses données source.");
  return target;
}
