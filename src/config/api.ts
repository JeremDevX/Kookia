export interface ApiErrorPayload { code: string; message: string; fields?: Record<string, string>; duplicates?: Array<{ id: string; version: string; date: string }>; }
export class ApiError extends Error {
  readonly status: number;
  readonly details: ApiErrorPayload;
  constructor(status: number, details: ApiErrorPayload) { super(details.message); this.status = status; this.details = details; }
}

let documentUserId: string | undefined;
export function bindDocumentUser(userId: string): boolean {
  if (!userId) throw new Error("Impossible de vérifier votre session.");
  if (documentUserId === undefined) documentUserId = userId;
  return documentUserId === userId;
}

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const pathname = path.split(/[?#]/, 1)[0];
  const mutation = ["POST", "PUT", "PATCH", "DELETE"].includes((options.method ?? "GET").toUpperCase());
  const accountMutation = mutation && (pathname === "/account" || pathname.startsWith("/account/") || pathname === "/auth/logout");
  if (pathname === "/workspace" || pathname.startsWith("/workspace/") || accountMutation) {
    if (!documentUserId && pathname !== "/auth/logout") throw new Error("Connectez-vous pour continuer.");
    if (documentUserId) headers.set("X-Expected-User-Id", documentUserId);
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: "include", headers });
  } catch (cause) {
    if (cause instanceof TypeError) throw new Error("Connexion au serveur indisponible. Vérifiez votre connexion puis réessayez.", { cause });
    throw cause;
  }
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as { error?: ApiErrorPayload } & T;
  if (!response.ok) throw new ApiError(response.status, payload.error ?? { code: "INTERNAL_ERROR", message: "Une erreur est survenue." });
  return payload as T;
};
