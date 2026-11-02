/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, bindDocumentUser } from "../../../config/api";
import { authApi } from "../api/authApi";
import type { Credentials, Registration, User } from "../types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
export const sessionErrorStatus = (error: unknown): AuthStatus => error instanceof ApiError && error.status === 401 ? "unauthenticated" : "error";
export interface AuthContextValue { status: AuthStatus; user: User | null; login: (credentials: Credentials) => Promise<void>; register: (data: Registration) => Promise<void>; logout: () => Promise<void>; refreshUser: () => Promise<void>; updateProfile: (displayName: string) => Promise<void>; }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const generation = useRef(0);
  const reload = useCallback(() => { setStatus("loading"); window.location.reload(); }, []);
  const acceptUser = useCallback((nextUser: User) => {
    if (!bindDocumentUser(nextUser.id)) { reload(); return; }
    setUser(nextUser); setStatus("authenticated");
  }, [reload]);
  const refreshUser = useCallback(async () => {
    const current = ++generation.current;
    setStatus((previous) => previous === "error" ? "loading" : previous);
    try { const result = await authApi.me(); if (generation.current === current) acceptUser(result.user); }
    catch (error) { if (generation.current === current) { setUser(null); setStatus(sessionErrorStatus(error)); } }
  }, [acceptUser]);
  useEffect(() => {
    let active = true;
    const current = generation.current;
    queueMicrotask(() => { if (active && generation.current === current) void refreshUser(); });
    return () => { active = false; };
  }, [refreshUser]);
  const login = useCallback(async (credentials: Credentials) => {
    const current = ++generation.current;
    const result = await authApi.login(credentials);
    if (generation.current !== current) { reload(); return; }
    acceptUser(result.user);
  }, [acceptUser, reload]);
  const register = useCallback(async (data: Registration) => {
    const current = ++generation.current;
    const result = await authApi.register(data);
    if (generation.current !== current) { reload(); return; }
    acceptUser(result.user);
  }, [acceptUser, reload]);
  const logout = useCallback(async () => {
    const current = ++generation.current;
    await authApi.logout();
    if (generation.current !== current) reload();
    else { setUser(null); setStatus("unauthenticated"); }
  }, [reload]);
  const updateProfile = useCallback(async (displayName: string) => {
    const current = generation.current;
    const result = await authApi.updateProfile(displayName);
    if (generation.current === current) acceptUser(result.user);
  }, [acceptUser]);
  return <AuthContext.Provider value={{ status, user, login, register, logout, refreshUser, updateProfile }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used within AuthProvider"); return value; };
