export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  source: "notification" | "dashboard" | "stocks";
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  addMultipleToCart: (items: CartItem[]) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  cartCount: number;
}
