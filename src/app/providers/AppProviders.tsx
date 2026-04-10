import type { ReactNode } from "react";
import { ToastProvider } from "../../context/ToastContext";
import { CartProvider } from "../../context/CartContext";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <ToastProvider>
    <CartProvider>{children}</CartProvider>
  </ToastProvider>
);

export default AppProviders;
