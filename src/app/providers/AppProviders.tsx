import type { ReactNode } from "react";
import { ToastProvider } from "../../context/ToastContext";
import { AuthProvider } from "../../features/auth/context/AuthContext";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <ToastProvider>
    <AuthProvider>{children}</AuthProvider>
  </ToastProvider>
);

export default AppProviders;
