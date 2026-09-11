import { apiRequest } from "../config/api";
import type { Notification } from "../components/layout/notificationPresentation";
type NotificationDto = Omit<Notification, "time">;
const present = (items: NotificationDto[]): Notification[] => items.map((item) => ({ ...item,
  time: new Date(item.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
}));
export const getNotifications = async () => present(await apiRequest<NotificationDto[]>("/workspace/notifications"));
export const markNotificationsRead = async (ids: string[]) => present(await apiRequest<NotificationDto[]>("/workspace/notifications/read", { method: "POST", body: JSON.stringify({ ids }) }));
