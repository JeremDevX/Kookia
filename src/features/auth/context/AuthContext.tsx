/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../../../config/api";
import { authApi } from "../api/authApi";
import type { Credentials, Registration, User } from "../types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
interface AuthContextValue { status: AuthStatus; user: User | null; login: (credentials: Credentials) => Promise<void>; register: (data: Registration) => Promise<void>; logout: () => Promise<void>; refreshUser: () => Promise<void>; updateProfile: (displayName: string) => Promise<void>; }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const refreshUser = useCallback(async () => { try { const result = await authApi.me(); setUser(result.user); setStatus("authenticated"); } catch (error) { if (error instanceof ApiError && error.status === 401) { setUser(null); setStatus("unauthenticated"); } else { setUser(null); setStatus("unauthenticated"); } } }, []);
  useEffect(() => { void refreshUser(); }, [refreshUser]);
  const login = useCallback(async (credentials: Credentials) => { const result = await authApi.login(credentials); setUser(result.user); setStatus("authenticated"); }, []);
  const register = useCallback(async (data: Registration) => { const result = await authApi.register(data); setUser(result.user); setStatus("authenticated"); }, []);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { setUser(null); setStatus("unauthenticated"); } }, []);
  const updateProfile = useCallback(async (displayName: string) => { const result = await authApi.updateProfile(displayName); setUser(result.user); }, []);
  return <AuthContext.Provider value={{ status, user, login, register, logout, refreshUser, updateProfile }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used within AuthProvider"); return value; };
