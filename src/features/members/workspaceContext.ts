import { createContext, useContext } from "react";
import type { SetupProgress } from "../setup/setupApi";

export const WorkspaceContext = createContext<SetupProgress | null>(null);

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("Workspace unavailable");
  return workspace;
}

export function useClientPresentation() {
  return useContext(WorkspaceContext)?.clientPresentation === true;
}
