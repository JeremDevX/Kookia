import { apiRequest } from "../config/api";
import type { Supplier } from "../types";
export interface Restaurant { name: string; type: string; address: string; city: string; phone: string; email: string; dailyCovers: number; }
export const getRestaurant = () => apiRequest<Restaurant>("/workspace/restaurant");
export const saveRestaurant = (restaurant: Restaurant) => apiRequest<Restaurant>("/workspace/restaurant", { method: "PATCH", body: JSON.stringify(restaurant) });
export const saveSupplier = (supplier: Supplier, create: boolean) => {
  const { id, ...data } = supplier;
  return apiRequest<Supplier>(create ? "/workspace/suppliers" : `/workspace/suppliers/${encodeURIComponent(id)}`, {
    method: create ? "POST" : "PATCH", body: JSON.stringify(create ? supplier : data),
  });
};
