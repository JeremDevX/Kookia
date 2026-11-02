export function setupDestination(configured: boolean, setupPage: boolean): "continue" | "setup" | "return" {
  if (setupPage && configured) return "return";
  if (!setupPage && !configured) return "setup";
  return "continue";
}

export function setupValues<T extends { dailyCovers: string; hasTerrace: string }>(form: T): Omit<T, "dailyCovers" | "hasTerrace"> & { dailyCovers: number; hasTerrace: boolean | null } {
  return { ...form, dailyCovers: Number(form.dailyCovers), hasTerrace: form.hasTerrace === "" ? null : form.hasTerrace === "yes" };
}
