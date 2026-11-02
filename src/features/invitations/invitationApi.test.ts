import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { acceptInvitation, createInvitation, listInvitations, revokeInvitation, tokenFromFragment } from "./invitationApi";

vi.mock("../../config/api", async (original) => ({ ...await original<typeof import("../../config/api")>(), apiRequest: vi.fn() }));
const request = vi.mocked(apiRequest);
const token = "a".repeat(64);
const invite = { id: "7a4d9b6d-86fa-4a43-966d-7a88a7f009e9", role: "chef", createdAt: "2026-11-02T10:00:00Z", expiresAt: "2026-11-09T10:00:00Z", revokedAt: null, acceptedAt: null };
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });

describe("invitations", () => {
  it("lit uniquement un jeton valide dans le fragment", () => {
    expect(tokenFromFragment(`#token=${token}`)).toBe(token);
    for (const fragment of ["", "#token=abc", `#token=${"g".repeat(64)}`]) expect(tokenFromFragment(fragment)).toBeNull();
  });
  it("crée un lien de la même origine sans simuler d’envoi", async () => {
    vi.stubGlobal("window", { location: { origin: "https://kookia.example" } });
    request.mockResolvedValueOnce({ ...invite, link: `https://kookia.example/invite#token=${token}` });
    const result = await createInvitation("chef");
    expect(result.link).toContain("#token=");
    expect(request).toHaveBeenCalledWith("/workspace/invitations", { method: "POST", body: JSON.stringify({ role: "chef" }) });
  });
  it("rejette un lien fourni pour un autre site", async () => {
    vi.stubGlobal("window", { location: { origin: "https://kookia.example" } });
    request.mockResolvedValueOnce({ ...invite, link: `https://elsewhere.example/invite#token=${token}` });
    await expect(createInvitation("chef")).rejects.toThrow("Le lien d’invitation est invalide.");
  });
  it("liste et révoque des invitations sans jeton", async () => {
    request.mockResolvedValueOnce([invite]).mockResolvedValueOnce(undefined);
    expect(await listInvitations()).toHaveLength(1);
    await revokeInvitation(invite.id);
    expect(request).toHaveBeenLastCalledWith(`/workspace/invitations/${invite.id}`, { method: "DELETE" });
  });
  it("accepte avec le jeton dans le corps et l’identité attendue dans l’en-tête", async () => {
    request.mockResolvedValueOnce({ accepted: true });
    await acceptInvitation(token, "account-id");
    expect(request).toHaveBeenCalledWith("/invitations/accept", { method: "POST", headers: { "X-Expected-User-Id": "account-id" }, body: JSON.stringify({ token }) });
  });
});
