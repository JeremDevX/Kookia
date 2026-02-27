import React, { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

// Cart item from notifications (simplified prediction-like structure)
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  source: "notification" | "dashboard" | "stocks";
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  addMultipleToCart: (items: CartItem[]) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

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

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
