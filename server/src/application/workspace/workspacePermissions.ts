export type WorkspaceRole = "owner" | "chef" | "kitchen";

// Paths are the encoded HTTP pathname, including /api/workspace, without a query string.
const allRoles = [
  "GET /inventory-session", "POST /inventory-session", "PUT /inventory-session/:id", "POST /inventory-session/:id/validate", "POST /inventory-session/:id/refresh", "POST /inventory-session/:id/discard",
  "GET /catalog", "GET /stock-lots", "GET /products/:id/lots", "GET /products/:id/counts",
  "GET /products/:id/movements", "POST /products/:id/counts",
  "GET /orders", "POST /orders/:id/receipts", "GET /orders/:id/receipt-invoices",
];
const chefAndOwner = [
  "GET /orders/suggestions", "GET /cart", "POST /cart", "POST /orders/suggestions/:id/decision", "POST /orders",
];
function safeSegment(segment: string): boolean {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded !== "" && decoded !== "." && decoded !== ".." && !/[\\/?#]/.test(decoded) && ![...decoded].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
  } catch { return false; }
}

function matches(pattern: string, method: string, path: string): boolean {
  const [expectedMethod, expectedPath] = pattern.split(" ");
  if (method !== expectedMethod) return false;
  const expected = expectedPath.split("/");
  const actual = path.split("/");
  return expected.length === actual.length && expected.every((segment, index) =>
    segment.startsWith(":") ? safeSegment(actual[index]) : segment === actual[index]);
}

export function canAccessWorkspace(role: unknown, method: string, pathname: string): boolean {
  if (role !== "owner" && role !== "chef" && role !== "kitchen") return false;
  const prefix = "/api/workspace";
  if (!pathname.startsWith(`${prefix}/`)) return false;
  if (role === "owner") return true;
  const path = pathname.slice(prefix.length);
  return allRoles.some((route) => matches(route, method, path)) ||
    (role === "chef" && chefAndOwner.some((route) => matches(route, method, path)));
}
