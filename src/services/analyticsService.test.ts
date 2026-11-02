import { afterEach, expect, it, vi } from "vitest";
import { bindDocumentUser } from "../config/api";
import { getAIReliability, getAnalyticsData, getDashboardActivity, getSavingsSummary, getWasteStats } from "./analyticsService";

afterEach(() => vi.restoreAllMocks());
it("conserve l’absence de données sans fabriquer de zéro", async () => {
  bindDocumentUser("test-account");
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("null", { status: 200 }));
  await expect(getAnalyticsData()).resolves.toBeNull();
  await expect(getDashboardActivity()).resolves.toBeNull();
  await expect(getWasteStats()).resolves.toBeNull();
  await expect(getAIReliability()).resolves.toBeNull();
  await expect(getSavingsSummary()).resolves.toBeNull();
});
