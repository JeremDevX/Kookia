import { describe, expect, it } from "vitest";
import type { CartItem } from "./cart.types";
import {
  addMultipleToCartState,
  addToCartState,
  clearCartState,
  isInCartState,
  removeFromCartState,
} from "./cartState";

const item1: CartItem = {
  id: "cart-1",
  productId: "p1",
  productName: "Tomates",
  quantity: 2,
  unit: "kg",
  source: "dashboard",
};

const item2: CartItem = {
  id: "cart-2",
  productId: "p2",
  productName: "Mozzarella",
  quantity: 1,
  unit: "kg",
  source: "notification",
};

describe("cartState", () => {
  it("adds item without duplicates", () => {
    const withOne = addToCartState([], item1);
    const withDuplicate = addToCartState(withOne, item1);

    expect(withOne).toHaveLength(1);
    expect(withDuplicate).toHaveLength(1);
  });

  it("adds multiple items while skipping existing ids", () => {
    const next = addMultipleToCartState([item1], [item1, item2]);

    expect(next).toHaveLength(2);
    expect(next[0].id).toBe("cart-1");
    expect(next[1].id).toBe("cart-2");
  });

  it("removes and clears cart items", () => {
    const removed = removeFromCartState([item1, item2], item1.id);

    expect(removed).toEqual([item2]);
    expect(clearCartState()).toEqual([]);
  });

  it("detects if item is in cart", () => {
    expect(isInCartState([item1], item1.id)).toBe(true);
    expect(isInCartState([item1], "unknown")).toBe(false);
  });
});
