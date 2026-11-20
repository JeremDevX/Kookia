import { z } from "zod";
import type { WorkshopRunIssue } from "../../shared/workshopControl";
import { ingredients } from "./catalog";

interface Connection {
  apiOrigin: URL;
  token: string;
  timeoutMs: number;
}

export class WorkshopRequestError extends Error {
  readonly issue: WorkshopRunIssue;

  constructor(message: string, issue: WorkshopRunIssue) {
    super(message);
    this.issue = issue;
  }
}

const errorBody = z.object({ error: z.object({ code: z.string(), message: z.string().optional() }) });

function requestIssue(code: string | undefined, message: string | undefined, status: number): WorkshopRunIssue {
  const httpStatus = status >= 400 && status <= 599 ? status : null;
  switch (code) {
    case "WORKSHOP_STOCK_CONFLICT": {
      const name = message?.match(/^Le produit « ([^»\p{Cc}]{1,120}) » ou ses lots diffèrent/u)?.[1];
      const product = ingredients.find(ingredient => ingredient.name.normalize("NFC") === name?.normalize("NFC"))?.name ?? null;
      return { code: "STOCK_CONFLICT", product, status: httpStatus };
    }
    case "WORKSHOP_STOCK_CHANGED": return { code: "STOCK_CONFLICT", product: null, status: httpStatus };
    case "WORKSHOP_STOCK_SEQUENCE": return { code: "STOCK_SEQUENCE", product: null, status: httpStatus };
    case "WORKSHOP_OPERATIONS_CHANGED":
    case "WORKSHOP_DAY_CONFLICT": return { code: "DAY_CONFLICT", product: null, status: httpStatus };
    case "WORKSHOP_APPROVED_ORDER_CONFLICT": return { code: "ORDER_CHANGED", product: null, status: httpStatus };
    case "WORKSHOP_SERVICE_CONFLICT": return { code: "SERVICE_CONFLICT", product: null, status: httpStatus };
    case "WORKSHOP_FORECAST_DATE":
    case "WORKSHOP_FORECAST_BASE_MISSING": return { code: "FORECAST", product: null, status: httpStatus };
    default: return { code: status === 400 || status === 422 ? "INVALID_INPUT" : "UNKNOWN", product: null, status: httpStatus };
  }
}

export async function requestWorkshop(config: Connection, endpoint: string, date: string, payload?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(new URL(endpoint, config.apiOrigin), {
      method: payload === undefined ? "GET" : "PUT",
      headers: { authorization: `Bearer ${config.token}`, ...(payload !== undefined && { "content-type": "application/json" }) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeoutMs),
      redirect: "error",
    });
  } catch {
    throw new WorkshopRequestError(`Impossible de joindre Kookia pour le ${date}.`, { code: "NETWORK", product: null, status: null });
  }
  if (response.status !== 200) {
    const detail = errorBody.safeParse(await response.json().catch(() => null)).data?.error;
    const issue = requestIssue(detail?.code, detail?.message, response.status);
    const message = issue.code === "ORDER_CHANGED"
      ? `Une commande validée a changé pour le ${date}. La prochaine reprise relira les commandes de Kookia.`
      : `Kookia a refusé le ${date} (HTTP ${response.status}).`;
    throw new WorkshopRequestError(message, issue);
  }
  return response.json().catch(() => null);
}
