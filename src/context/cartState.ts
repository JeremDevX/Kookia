import type { CartItem } from "./cart.types";

export const addToCartState = (
  currentItems: CartItem[],
  item: CartItem
): CartItem[] => {
  if (currentItems.some((existingItem) => existingItem.id === item.id)) {
    return currentItems;
  }

  return [...currentItems, item];
};

export const addMultipleToCartState = (
  currentItems: CartItem[],
  items: CartItem[]
): CartItem[] => {
  const existingIds = new Set(currentItems.map((item) => item.id));
  const uniqueNewItems = items.filter((item) => !existingIds.has(item.id));

  return [...currentItems, ...uniqueNewItems];
};

export const removeFromCartState = (
  currentItems: CartItem[],
  id: string
): CartItem[] => currentItems.filter((item) => item.id !== id);

export const clearCartState = (): CartItem[] => [];

export const isInCartState = (currentItems: CartItem[], id: string): boolean =>
  currentItems.some((item) => item.id === id);
