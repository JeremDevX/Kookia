import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { listMembers } from "./memberApi";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));

describe("liste des membres", () => {
  it("valide les données reçues avant de les afficher", async () => {
    const member = { userId: "123e4567-e89b-42d3-a456-426614174000", role: "chef", createdAt: "2026-11-03T10:00:00.000Z", user: { displayName: "Alex Exemple", email: "alex@example.test" } };
    vi.mocked(apiRequest).mockResolvedValueOnce([member]).mockResolvedValueOnce([{ ...member, role: "inconnu" }]);
    await expect(listMembers()).resolves.toEqual([member]);
    await expect(listMembers()).rejects.toThrow();
  });
});
