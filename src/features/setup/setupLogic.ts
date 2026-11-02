import type { SetupStep } from "./setupApi";

export function setupDestination(configured: boolean, step: SetupStep | null, setupPage: boolean): "continue" | "setup" | "return" {
  if (setupPage && configured && step === null) return "return";
  if (!setupPage && (!configured || step !== null)) return "setup";
  return "continue";
}

export function setupValues<T extends { dailyCovers: string; hasTerrace: string }>(form: T): Omit<T, "dailyCovers" | "hasTerrace"> & { dailyCovers: number; hasTerrace: boolean | null } {
  return { ...form, dailyCovers: Number(form.dailyCovers), hasTerrace: form.hasTerrace === "" ? null : form.hasTerrace === "yes" };
}
