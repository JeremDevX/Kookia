import { useEffect } from "react";
import { useAuth } from "../../features/auth/context/AuthContext";
import { warnForDraft } from "./pendingDraftWarning";

export default function DraftWarning() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const warn = (event: BeforeUnloadEvent) => warnForDraft(user.id, event);
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [user]);
  return null;
}
