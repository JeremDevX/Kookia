import { z } from "zod";
import { apiRequest } from "../../config/api";

const invitationSchema = z.object({ id: z.uuid(), role: z.enum(["chef", "kitchen"]), createdAt: z.iso.datetime({ offset: true }), expiresAt: z.iso.datetime({ offset: true }), revokedAt: z.iso.datetime({ offset: true }).nullable(), acceptedAt: z.iso.datetime({ offset: true }).nullable() });
export type Invitation = z.infer<typeof invitationSchema>;
export type InvitationRole = Invitation["role"];

export function tokenFromFragment(fragment: string): string | null {
  const token = new URLSearchParams(fragment.startsWith("#") ? fragment.slice(1) : fragment).get("token");
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function listInvitations() {
  return z.array(invitationSchema).parse(await apiRequest<unknown>("/workspace/invitations"));
}
export async function createInvitation(role: InvitationRole) {
  const result = invitationSchema.extend({ link: z.url() }).parse(await apiRequest<unknown>("/workspace/invitations", { method: "POST", body: JSON.stringify({ role }) }));
  const url = new URL(result.link);
  if (url.origin !== window.location.origin || url.username || url.password || url.pathname !== "/invite" || url.search || !tokenFromFragment(url.hash)) throw new Error("Le lien d’invitation est invalide.");
  return result;
}
export const revokeInvitation = (id: string) => apiRequest<void>(`/workspace/invitations/${encodeURIComponent(id)}`, { method: "DELETE" });
export async function acceptInvitation(token: string, expectedUserId: string) {
  const result = await apiRequest<unknown>("/invitations/accept", { method: "POST", headers: { "X-Expected-User-Id": expectedUserId }, body: JSON.stringify({ token }) });
  return z.object({ accepted: z.literal(true) }).parse(result);
}
