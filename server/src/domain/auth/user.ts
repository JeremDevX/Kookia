import type { User } from "@prisma/client";

export type PublicUser = Pick<User, "id" | "displayName" | "email" | "createdAt">;
export const toPublicUser = (user: User): PublicUser => ({ id: user.id, displayName: user.displayName, email: user.email, createdAt: user.createdAt });
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
