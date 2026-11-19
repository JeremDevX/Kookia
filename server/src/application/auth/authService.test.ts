import { beforeEach, expect, it, vi } from "vitest";
import { changeEmail, changePassword, deleteAccount, getUserBySessionToken, loginUser } from "./authService.js";

const db = vi.hoisted(() => ({
  findUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  findSession: vi.fn(),
  updateSession: vi.fn(),
  tx: {
    user: { updateMany: vi.fn(), updateManyAndReturn: vi.fn() },
    session: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock("../../config/env.js", () => ({ env: { SESSION_TTL_DAYS: 7 } }));
vi.mock("../../infrastructure/database/prisma.js", () => ({ prisma: {
  user: { findUnique: db.findUser, updateManyAndReturn: db.updateUser, deleteMany: db.deleteUser },
  session: { findUnique: db.findSession, updateMany: db.updateSession },
  $transaction: (callback: (tx: typeof db.tx) => unknown) => callback(db.tx),
} }));
vi.mock("../../security/passwordHasher.js", () => ({
  verifyPassword: async () => true,
  hashPassword: async () => "new-hash",
}));

const user = { id: "user", emailNormalized: "user@example.com", passwordHash: "verified-hash" };
beforeEach(() => {
  vi.resetAllMocks();
  db.findUser.mockResolvedValue(user);
});

it("issuing a login session requires the verified credentials to remain current", async () => {
  db.tx.user.updateManyAndReturn.mockResolvedValue([]);
  await expect(loginUser(user.emailNormalized, "password")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  expect(db.tx.user.updateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({ where: user }));
  expect(db.tx.session.create).not.toHaveBeenCalled();
});

it("leaves sessions alone when the verified password has already changed", async () => {
  db.tx.user.updateMany.mockResolvedValue({ count: 0 });
  await expect(changePassword(user.id, "password", "new password")).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });
  expect(db.tx.user.updateMany).toHaveBeenCalledWith({
    where: { id: user.id, passwordHash: user.passwordHash }, data: { passwordHash: "new-hash" },
  });
  expect(db.tx.session.deleteMany).not.toHaveBeenCalled();
  expect(db.tx.session.create).not.toHaveBeenCalled();
});

it("requires the verified password to remain current when changing the account email", async () => {
  db.updateUser.mockResolvedValue([]);
  await expect(changeEmail(user.id, "new@example.com", "password")).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });
  expect(db.updateUser).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: user.id, passwordHash: user.passwordHash },
  }));
});

it("requires the verified password to remain current when deleting the account", async () => {
  db.deleteUser.mockResolvedValue({ count: 0 });
  await expect(deleteAccount(user.id, "password")).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });
  expect(db.deleteUser).toHaveBeenCalledWith({ where: { id: user.id, passwordHash: user.passwordHash } });
});

it("rejects a session revoked while it is being checked", async () => {
  db.findSession.mockResolvedValue({ id: "session", expiresAt: new Date(Date.now() + 60_000), user });
  db.updateSession.mockResolvedValue({ count: 0 });
  await expect(getUserBySessionToken("session-token")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
});
