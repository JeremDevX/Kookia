import { isOrderQuantity } from "../../../shared/orderQuantity.js";

export const isValidOrderQuantity = (value: string, step = 0.001): boolean => {
  const quantity = Number(value);
  return /^\d+(?:\.\d{1,3})?$/.test(value.trim()) && isOrderQuantity(quantity, step);
};
