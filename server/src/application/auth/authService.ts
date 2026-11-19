import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { hashPassword, verifyPassword } from "../../security/passwordHasher.js";
import { createSessionToken, hashSessionToken } from "../../security/sessionToken.js";
import { EmailAlreadyUsedError, InvalidCredentialsError, InvalidCurrentPasswordError, UnauthenticatedError } from "../../domain/auth/errors.js";
import { normalizeEmail, toPublicUser, type PublicUser } from "../../domain/auth/user.js";

const createSession = async (tx: Prisma.TransactionClient, userId: string) => {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
  await tx.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } });
  return { token, expiresAt };
};

export const getUserBySessionToken = async (token: unknown): Promise<PublicUser> => {
  if (typeof token !== "string" || !token) throw new UnauthenticatedError();
  const session = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true } });
  const now = new Date();
  if (!session) throw new UnauthenticatedError();
  if (session.expiresAt <= now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    throw new UnauthenticatedError();
  }
  const { count } = await prisma.session.updateMany({ where: { id: session.id }, data: { lastSeenAt: now } });
  if (!count) throw new UnauthenticatedError();
  return toPublicUser(session.user);
};

export const registerUser = async (displayName: string, email: string, password: string) => {
  const emailNormalized = normalizeEmail(email);
  const passwordHash = await hashPassword(password);
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { displayName: displayName.trim(), email: email.trim(), emailNormalized, passwordHash, lastLoginAt: new Date() } });
      const session = await createSession(tx, user.id);
      return { user: toPublicUser(user), ...session };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new EmailAlreadyUsedError();
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { emailNormalized: normalizeEmail(email) } });
  if (!user || !(await verifyPassword(user.passwordHash, password))) throw new InvalidCredentialsError();
  return prisma.$transaction(async tx => {
    const [updated] = await tx.user.updateManyAndReturn({
      where: { id: user.id, emailNormalized: user.emailNormalized, passwordHash: user.passwordHash },
      data: { lastLoginAt: new Date() },
    });
    if (!updated) throw new InvalidCredentialsError();
    const session = await createSession(tx, updated.id);
    return { user: toPublicUser(updated), ...session };
  });
};

export const updateProfile = async (userId: string, displayName: string) => toPublicUser(await prisma.user.update({ where: { id: userId }, data: { displayName: displayName.trim() } }));

const requireVerifiedPassword = async (userId: string, currentPassword: string): Promise<string> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new UnauthenticatedError();
  if (!(await verifyPassword(user.passwordHash, currentPassword))) throw new InvalidCurrentPasswordError();
  return user.passwordHash;
};

export const changeEmail = async (userId: string, newEmail: string, currentPassword: string) => {
  const passwordHash = await requireVerifiedPassword(userId, currentPassword);
  try {
    const [updated] = await prisma.user.updateManyAndReturn({ where: { id: userId, passwordHash },
      data: { email: newEmail.trim(), emailNormalized: normalizeEmail(newEmail) } });
    if (!updated) throw new InvalidCurrentPasswordError();
    return toPublicUser(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new EmailAlreadyUsedError();
    throw error;
  }
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const verifiedPasswordHash = await requireVerifiedPassword(userId, currentPassword);
  const passwordHash = await hashPassword(newPassword);
  return prisma.$transaction(async tx => {
    const { count } = await tx.user.updateMany({ where: { id: userId, passwordHash: verifiedPasswordHash }, data: { passwordHash } });
    if (!count) throw new InvalidCurrentPasswordError();
    await tx.session.deleteMany({ where: { userId } });
    return createSession(tx, userId);
  });
};

export const deleteAccount = async (userId: string, currentPassword: string) => {
  const passwordHash = await requireVerifiedPassword(userId, currentPassword);
  const { count } = await prisma.user.deleteMany({ where: { id: userId, passwordHash } });
  if (!count) throw new InvalidCurrentPasswordError();
};

export const logout = async (token: string | undefined) => { if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } }); };
