import { z } from "zod";
import { apiRequest } from "../../config/api";

const memberSchema = z.object({ userId: z.uuid(), role: z.enum(["chef", "kitchen"]), createdAt: z.iso.datetime({ offset: true }), user: z.object({ displayName: z.string(), email: z.email() }) });
export type Member = z.infer<typeof memberSchema>;

export async function listMembers(): Promise<Member[]> {
  return z.array(memberSchema).parse(await apiRequest<unknown>("/workspace/members"));
}
