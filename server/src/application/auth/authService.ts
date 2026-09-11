import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { hashPassword, verifyPassword } from "../../security/passwordHasher.js";
import { createSessionToken, hashSessionToken } from "../../security/sessionToken.js";
import { EmailAlreadyUsedError, InvalidCredentialsError, InvalidCurrentPasswordError, UnauthenticatedError } from "../../domain/auth/errors.js";
import { normalizeEmail, toPublicUser, type PublicUser } from "../../domain/auth/user.js";

export const createSession = async (userId: string) => {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
  await prisma.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } });
  return { token, expiresAt };
};

export const getUserBySessionToken = async (token: string | undefined): Promise<PublicUser> => {
  if (!token) throw new UnauthenticatedError();
  const session = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    throw new UnauthenticatedError();
  }
  await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  return toPublicUser(session.user);
};

export const registerUser = async (displayName: string, email: string, password: string) => {
  const emailNormalized = normalizeEmail(email);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { displayName: displayName.trim(), email: email.trim(), emailNormalized, passwordHash: await hashPassword(password), lastLoginAt: new Date() } });
      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
      await tx.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt } });
      return { user: toPublicUser(user), token, expiresAt };
    });
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new EmailAlreadyUsedError();
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { emailNormalized: normalizeEmail(email) } });
  if (!user || !(await verifyPassword(user.passwordHash, password))) throw new InvalidCredentialsError();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const session = await createSession(user.id);
  return { user: toPublicUser(user), ...session };
};

export const updateProfile = async (userId: string, displayName: string) => toPublicUser(await prisma.user.update({ where: { id: userId }, data: { displayName: displayName.trim() } }));

export const changeEmail = async (userId: string, newEmail: string, currentPassword: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) throw new InvalidCurrentPasswordError();
  try { return toPublicUser(await prisma.user.update({ where: { id: userId }, data: { email: newEmail.trim(), emailNormalized: normalizeEmail(newEmail) } })); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new EmailAlreadyUsedError(); throw error; }
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string, currentToken: string | undefined) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) throw new InvalidCurrentPasswordError();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
  await prisma.$transaction([prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }), prisma.session.deleteMany({ where: { userId } }), prisma.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } })]);
  return { token, expiresAt, currentToken };
};

export const deleteAccount = async (userId: string, currentPassword: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) throw new InvalidCurrentPasswordError();
  await prisma.user.delete({ where: { id: userId } });
};

export const logout = async (token: string | undefined) => { if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } }); };
