export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  predictionId?: string;
  source: "notification" | "dashboard" | "stocks";
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => Promise<boolean>;
  addMultipleToCart: (items: CartItem[]) => Promise<boolean>;
  removeFromCart: (id: string) => Promise<boolean>;
  refreshCart: () => Promise<boolean>;
  loading: boolean;
  isInCart: (id: string) => boolean;
  cartCount: number;
}
