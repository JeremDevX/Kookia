export function returnTo(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) return "/";
  const from = state.from;
  if (!from || typeof from !== "object" || !("pathname" in from) || typeof from.pathname !== "string") return "/";
  const { pathname } = from;
  if (!pathname.startsWith("/") || pathname.startsWith("//") || /[\\?#]/.test(pathname) || [...pathname].some((char) => char.charCodeAt(0) < 32)) return "/";
  const search = "search" in from && typeof from.search === "string" && from.search.startsWith("?") ? from.search : "";
  const hash = "hash" in from && typeof from.hash === "string" && from.hash.startsWith("#") ? from.hash : "";
  return pathname + search + hash;
}
