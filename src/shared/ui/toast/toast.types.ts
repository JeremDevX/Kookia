export type ToastType = "success" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}
