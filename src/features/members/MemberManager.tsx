import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import { apiRequest } from "../../config/api";
import { listMembers, type Member } from "./memberApi";

export default function MemberManager() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listMembers().then(
      (result) => { if (active) setMembers(result); },
      () => { if (active) setError("Impossible de charger les membres."); },
    );
    return () => { active = false; };
  }, [attempt]);
  const revoke = async (id: string) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await apiRequest(`/workspace/members/${encodeURIComponent(id)}`, { method: "DELETE" }); setConfirmId(null); setMembers((current) => current?.filter((member) => member.userId !== id) ?? null); }
    catch (err) { setError(err instanceof Error ? err.message : "Impossible de retirer ce membre."); setAttempt((value) => value + 1); }
    finally { setBusy(false); }
  };
  return <section className="member-manager" aria-labelledby="members-title"><h2 id="members-title">Membres de l’équipe</h2>
    {error && <div role="alert"><p>{error}</p>{!members && <Button type="button" variant="outline" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Réessayer</Button>}</div>}
    {!members ? !error && <p role="status">Chargement des membres…</p> : members.length === 0 ? <p>Aucun membre ajouté.</p> : <ul>{members.map((member) => <li key={member.userId}>
      <strong>{member.user.displayName}</strong> · {member.user.email} · {member.role === "chef" ? "Chef" : "Cuisine"}
      {confirmId === member.userId ? <span> Retirer cet accès ? <Button type="button" disabled={busy} onClick={() => void revoke(member.userId)}>Retirer l’accès</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmId(null)}>Annuler</Button></span> : <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmId(member.userId)}>Retirer l’accès de {member.user.displayName}</Button>}
    </li>)}</ul>}
  </section>;
}
