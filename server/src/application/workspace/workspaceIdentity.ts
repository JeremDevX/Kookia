import { prisma } from "../../infrastructure/database/prisma.js";
import type { WorkspaceRole } from "./workspacePermissions.js";

export async function resolveWorkspace(userId: string): Promise<{ restaurantId: string; restaurantName: string; role: WorkspaceRole } | null> {
  const owner = await prisma.restaurant.findUnique({ where: { ownerId: userId }, select: { id: true, name: true } });
  if (owner) return { restaurantId: owner.id, restaurantName: owner.name, role: "owner" };
  const membership = await prisma.membership.findUnique({ where: { userId }, select: { restaurantId: true, role: true, restaurant: { select: { name: true } } } });
  if (!membership || (membership.role !== "chef" && membership.role !== "kitchen")) return null;
  return { restaurantId: membership.restaurantId, restaurantName: membership.restaurant.name, role: membership.role };
}

export function workspaceCapabilities(role: WorkspaceRole) {
  return { viewStock: true, countStock: true, receiveOrders: true, validateOrders: role !== "kitchen", manageSettings: role === "owner" };
}
