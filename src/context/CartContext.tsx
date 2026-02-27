import React, { useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { CartItem } from "./cart.types";
import { CartContext } from "./cart.context";
import {
  addToCartState,
  addMultipleToCartState,
  removeFromCartState,
  clearCartState,
  isInCartState,
} from "./cartState";

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: CartItem) => {
    setCartItems((prev) => addToCartState(prev, item));
  }, []);

  const addMultipleToCart = useCallback((items: CartItem[]) => {
    setCartItems((prev) => addMultipleToCartState(prev, items));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => removeFromCartState(prev, id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems(clearCartState());
  }, []);

  const isInCart = useCallback(
    (id: string) => isInCartState(cartItems, id),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addMultipleToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
