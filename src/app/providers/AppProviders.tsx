import type { ReactNode } from "react";
import { ToastProvider } from "../../context/ToastContext";
import DraftWarning from "./DraftWarning";
import { AuthProvider } from "../../features/auth/context/AuthContext";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <ToastProvider>
    <AuthProvider><DraftWarning />{children}</AuthProvider>
  </ToastProvider>
);

export default AppProviders;
