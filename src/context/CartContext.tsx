import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { CartItem } from "./cart.types";
import { CartContext } from "./cart.context";
import { apiRequest } from "../config/api";
import { useAuth } from "../features/auth/context/AuthContext";
import { useToast } from "./ToastContext";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Remount the store on account changes so in-flight results cannot leak into another account.
  return <AccountCart key={user?.id ?? "anonymous"} authenticated={!!user}>{children}</AccountCart>;
}

function AccountCart({ children, authenticated }: { children: ReactNode; authenticated: boolean }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(authenticated);
  const { addToast } = useToast();
  const alive = useRef(true);
  const sequence = useRef(Promise.resolve());
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const request = useCallback((body?: object): Promise<boolean> => {
    if (!authenticated) return Promise.resolve(false);
    // Serialize this tab's operations so responses cannot overwrite newer local state.
    let success = false;
    const operation = sequence.current.then(async () => {
      if (!alive.current) return;
      setLoading(true);
      try {
        const data = await apiRequest<CartItem[]>("/workspace/cart", body ? { method: "POST", body: JSON.stringify(body) } : {});
        if (alive.current) { setCartItems(data); success = true; }
      } catch (error) {
        if (alive.current) addToast("info", "Panier indisponible", error instanceof Error ? error.message : "Réessayez.");
      } finally { if (alive.current) setLoading(false); }
    });
    sequence.current = operation;
    return operation.then(() => success);
  }, [authenticated, addToast]);
  useEffect(() => { void request(); }, [request]);
  const addToCart = useCallback((item: CartItem) => request({ action: "add", items: [item] }), [request]);
  const addMultipleToCart = useCallback((items: CartItem[]) => request({ action: "add", items }), [request]);
  const removeFromCart = useCallback((id: string) => request({ action: "remove", ids: [id] }), [request]);
  const refreshCart = useCallback(() => request(), [request]);
  return <CartContext.Provider value={{ cartItems, addToCart, addMultipleToCart, removeFromCart, refreshCart,
    loading, cartCount: cartItems.length, isInCart: (id) => cartItems.some((item) => item.id === id) }}>{children}</CartContext.Provider>;
}
