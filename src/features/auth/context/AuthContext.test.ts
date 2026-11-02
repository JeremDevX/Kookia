import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { bindDocumentUser } from "../../../config/api";
import { authApi } from "../api/authApi";
import { AuthProvider, type AuthContextValue } from "./AuthContext";
import type { User } from "../types";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
  useRef: vi.fn((value: unknown) => ({ current: value })),
  useEffect: vi.fn(),
  useCallback: vi.fn((callback: unknown) => callback),
}));
vi.mock("../../../config/api", async (original) => ({
  ...await original<typeof import("../../../config/api")>(),
  bindDocumentUser: vi.fn(),
}));
vi.mock("../api/authApi", () => ({ authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateProfile: vi.fn() } }));

const account = (id: string): User => ({ id, displayName: id, email: `${id}@example.test`, createdAt: "2026-01-01" });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
const context = () => AuthProvider({ children: null }).props.value as AuthContextValue;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bindDocumentUser).mockReturnValue(true);
  vi.stubGlobal("window", { location: { reload: vi.fn() } });
});

describe("authentification concurrente", () => {
  it("ignores an older session response after login", async () => {
    const initial = deferred<{ user: User }>();
    vi.mocked(authApi.me).mockReturnValueOnce(initial.promise);
    vi.mocked(authApi.login).mockResolvedValueOnce({ user: account("b") });
    const auth = context();
    const refresh = auth.refreshUser();
    await auth.login({ email: "b@example.test", password: "secret" });
    initial.resolve({ user: account("a") });
    await refresh;
    expect(bindDocumentUser).toHaveBeenCalledTimes(1);
    expect(bindDocumentUser).toHaveBeenCalledWith("b");
  });
  it("reloads before publishing a different account", async () => {
    vi.mocked(bindDocumentUser).mockReturnValue(false);
    vi.mocked(authApi.login).mockResolvedValueOnce({ user: account("b") });
    const auth = context();
    await auth.login({ email: "b@example.test", password: "secret" });
    expect(window.location.reload).toHaveBeenCalledOnce();
    const userSetter = vi.mocked(useState).mock.results[1].value[1];
    expect(userSetter).not.toHaveBeenCalled();
  });
  it("reloads if an older login changes the cookie after a newer session check", async () => {
    const pending = deferred<{ user: User }>();
    vi.mocked(authApi.login).mockReturnValueOnce(pending.promise);
    vi.mocked(authApi.me).mockResolvedValueOnce({ user: account("b") });
    const auth = context();
    const login = auth.login({ email: "a@example.test", password: "secret" });
    await auth.refreshUser();
    pending.resolve({ user: account("a") });
    await login;
    expect(window.location.reload).toHaveBeenCalledOnce();
    expect(bindDocumentUser).toHaveBeenCalledTimes(1);
    expect(bindDocumentUser).toHaveBeenCalledWith("b");
  });
});
