import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

const { logout, navigate, addToast } = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn(), addToast: vi.fn() }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
  useRef: vi.fn((value: unknown) => ({ current: value })),
  useEffect: vi.fn(),
  useLayoutEffect: vi.fn(),
}));
vi.mock("react-router-dom", async (original) => ({
  ...await original<typeof import("react-router-dom")>(),
  useLocation: () => ({ pathname: "/", search: "", hash: "" }),
  useNavigate: () => navigate,
}));
vi.mock("../../features/auth/context/AuthContext", () => ({ useAuth: () => ({ logout }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ addToast }) }));

function findLogout(node: unknown): ReactElement<{ onClick: () => void }> | undefined {
  if (!isValidElement<{ className?: string; children?: unknown; onClick?: () => void }>(node)) return;
  if (node.props.className === "nav-item logout-btn") return node as ReactElement<{ onClick: () => void }>;
  for (const child of Children.toArray(node.props.children as never)) {
    const found = findLogout(child);
    if (found) return found;
  }
}

beforeEach(() => vi.clearAllMocks());
describe("déconnexion du menu", () => {
  it("navigue après une déconnexion réussie", async () => {
    logout.mockResolvedValueOnce(undefined);
    findLogout(Sidebar({ isOpen: false, onClose: vi.fn(), returnFocusRef: { current: null } }))?.props.onClick();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/login", { replace: true }));
    expect(addToast).not.toHaveBeenCalled();
  });
  it("affiche l’erreur et conserve la page si la déconnexion échoue", async () => {
    logout.mockRejectedValueOnce(new Error("Session modifiée."));
    findLogout(Sidebar({ isOpen: false, onClose: vi.fn(), returnFocusRef: { current: null } }))?.props.onClick();
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledWith("info", "Déconnexion impossible", "Session modifiée."));
    expect(navigate).not.toHaveBeenCalled();
  });
});
