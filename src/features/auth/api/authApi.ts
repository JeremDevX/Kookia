import { apiRequest } from "../../../config/api";
import type { Credentials, Registration, User } from "../types";
const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
export const authApi = {
  me: () => apiRequest<{ user: User }>("/auth/me"),
  login: (body: Credentials) => apiRequest<{ user: User }>("/auth/login", json(body)),
  register: (body: Registration) => apiRequest<{ user: User }>("/auth/register", json(body)),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
  updateProfile: (displayName: string) => apiRequest<{ user: User }>("/account/profile", { method: "PATCH", body: JSON.stringify({ displayName }) }),
  changeEmail: (newEmail: string, currentPassword: string) => apiRequest<{ user: User }>("/account/change-email", json({ newEmail, currentPassword })),
  changePassword: (currentPassword: string, newPassword: string) => apiRequest<void>("/account/change-password", json({ currentPassword, newPassword })),
  deleteAccount: (currentPassword: string) => apiRequest<void>("/account", { method: "DELETE", body: JSON.stringify({ currentPassword }) }),
};
