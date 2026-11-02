export function requireDemoSeedTarget(databaseUrl: string, nodeEnv: string, ownerId: string | undefined): string {
  let url: URL;
  try { url = new URL(databaseUrl); } catch { throw new Error("Base de démonstration locale requise."); }
  if (nodeEnv !== "development" || !ownerId || !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "127.0.0.1" || url.pathname !== "/kookia_demo" || url.search || url.hash) {
    throw new Error("Peuplement réservé à un compte identifié dans la base de démonstration locale.");
  }
  return ownerId;
}

export function requireSingleDemoOwner(ownerId: string, users: Array<{ id: string }>): void {
  if (users.length !== 1 || users[0].id !== ownerId) {
    throw new Error("La base de démonstration doit contenir uniquement le compte temporaire attendu.");
  }
}
