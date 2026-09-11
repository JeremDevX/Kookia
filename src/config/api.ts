export interface ApiErrorPayload { code: string; message: string; fields?: Record<string, string>; }
export class ApiError extends Error {
  readonly status: number;
  readonly details: ApiErrorPayload;
  constructor(status: number, details: ApiErrorPayload) { super(details.message); this.status = status; this.details = details; }
}

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, { ...options, credentials: "include", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as { error?: ApiErrorPayload } & T;
  if (!response.ok) throw new ApiError(response.status, payload.error ?? { code: "INTERNAL_ERROR", message: "Une erreur est survenue." });
  return payload as T;
};
