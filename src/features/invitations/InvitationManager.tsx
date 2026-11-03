import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import { createInvitation, listInvitations, revokeInvitation, type Invitation, type InvitationRole } from "./invitationApi";

const roleLabel: Record<InvitationRole, string> = { chef: "Chef", kitchen: "Cuisine" };
const status = (invitation: Invitation) => invitation.revokedAt ? "Révoquée" : invitation.acceptedAt ? "Utilisée" : Date.parse(invitation.expiresAt) <= Date.now() ? "Expirée" : "Disponible";

export default function InvitationManager({ onPendingLinkChange }: { onPendingLinkChange?: (pending: boolean) => void } = {}) {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [role, setRole] = useState<InvitationRole>("kitchen");
  const [link, setLink] = useState<{ id: string; value: string } | null>(null);
  const updateLink = (value: { id: string; value: string } | null) => { setLink(value); onPendingLinkChange?.(value !== null); };
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useEffect(() => {
    if (!link) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [link]);
  useEffect(() => {
    let active = true;
    listInvitations().then((items) => { if (active) setInvitations(items); }, () => { if (active) setError("Impossible de charger les invitations."); });
    return () => { active = false; };
  }, [retry]);
  const create = async () => {
    if (busy || link) return;
    setBusy(true); setError(""); setNotice("");
    try { const { link: generatedLink, ...created } = await createInvitation(role); setInvitations((current) => current ? [created, ...current] : [created]); updateLink({ id: created.id, value: generatedLink }); }
    catch (err) { setError(err instanceof Error ? err.message : "Impossible de créer l’invitation."); setRetry((value) => value + 1); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await revokeInvitation(id); if (link?.id === id) updateLink(null); setConfirmId(null); setNotice("Invitation révoquée."); setRetry((value) => value + 1); }
    catch (err) { setError(err instanceof Error ? err.message : "Impossible de révoquer l’invitation."); setRetry((value) => value + 1); }
    finally { setBusy(false); }
  };
  return <section className="invitation-manager" aria-labelledby="invitations-title"><h2 id="invitations-title">Inviter un membre</h2>
    <p>Créez un lien à transmettre vous-même. Toute personne possédant le lien peut accéder au restaurant après connexion.</p>
    {error && <div role="alert"><p>{error}</p>{!invitations && <Button type="button" variant="outline" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Réessayer</Button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {!invitations ? !error && <p role="status">Chargement des invitations…</p> : <>
      <div className="invitation-create"><label htmlFor="invite-role">Rôle<select id="invite-role" className="input-field" value={role} disabled={busy} onChange={(event) => setRole(event.target.value as InvitationRole)}><option value="kitchen">Cuisine</option><option value="chef">Chef</option></select></label>
      <Button type="button" disabled={busy || !!link} onClick={() => void create()}>{busy ? "Veuillez patienter…" : "Créer un lien"}</Button></div>
      {link && <div><label htmlFor="invitation-link">Lien à transmettre</label><input id="invitation-link" className="input-field" readOnly value={link.value} onFocus={(event) => event.currentTarget.select()} />
        <p>Copiez ce lien maintenant : il ne pourra pas être affiché à nouveau. Si vous quittez la page, vous pourrez révoquer l’invitation et créer un autre lien.</p><Button type="button" variant="outline" onClick={() => { if (!navigator.clipboard) { setNotice("Sélectionnez le lien pour le copier."); return; } void navigator.clipboard.writeText(link.value).then(() => setNotice("Lien copié.")).catch(() => setNotice("Sélectionnez le lien pour le copier.")); }}>Copier le lien</Button><Button type="button" variant="ghost" onClick={() => updateLink(null)}>J’ai terminé</Button></div>}
      <h3>Invitations</h3>{invitations.length === 0 ? <p>Aucune invitation créée.</p> : <ul>{invitations.map((invitation) => <li key={invitation.id}>
        {roleLabel[invitation.role]} · {status(invitation)} · expire le {new Date(invitation.expiresAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
        {status(invitation) === "Disponible" && (confirmId === invitation.id ? <span> Révoquer ce lien ? <Button type="button" disabled={busy} onClick={() => void revoke(invitation.id)}>Révoquer</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmId(null)}>Annuler</Button></span> : <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmId(invitation.id)}>Révoquer l’invitation {roleLabel[invitation.role]}</Button>)}
      </li>)}</ul>}
    </>}
  </section>;
}
