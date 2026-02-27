/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { CheckCircle, Info, X } from "lucide-react";
import "../components/common/Toast.css";
import type { Toast, ToastType } from "../types";

interface ToastContextType {
  addToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Check ref.current immediately
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message: string) => {
      const id = Date.now() + Math.random(); // Add randomness to prevent collision
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto remove after 4 seconds
      const timeout = setTimeout(() => {
        // We use functional update, so we don't depend on 'toasts' state
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutsRef.current.delete(id);
      }, 4000);

      timeoutsRef.current.set(id, timeout);
    },
    []
  );

  // Cleanup all timeouts on unmount
  useEffect(() => {
    const currentTimeouts = timeoutsRef.current;
    return () => {
      currentTimeouts.forEach((timeout) => clearTimeout(timeout));
      currentTimeouts.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? (
                <CheckCircle size={20} />
              ) : (
                <Info size={20} />
              )}
            </div>
            <div className="toast-content">
              <h4 className="toast-title">{toast.title}</h4>
              <p className="toast-message">{toast.message}</p>
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
