import React, { useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { CartItem } from "./cart.types";
import { CartContext } from "./cart.context";


export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      // Avoid duplicates
      if (prev.find((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const addMultipleToCart = useCallback((items: CartItem[]) => {
    setCartItems((prev) => {
      const newItems = items.filter(
        (item) => !prev.find((i) => i.id === item.id)
      );
      return [...prev, ...newItems];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const isInCart = useCallback(
    (id: string) => cartItems.some((item) => item.id === id),
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
