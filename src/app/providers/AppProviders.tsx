import type { ReactNode } from "react";
import { ToastProvider } from "../../context/ToastContext";
import { CartProvider } from "../../context/CartContext";
import { AuthProvider } from "../../features/auth/context/AuthContext";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <ToastProvider>
    <AuthProvider><CartProvider>{children}</CartProvider></AuthProvider>
  </ToastProvider>
);

export default AppProviders;
