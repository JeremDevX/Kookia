import { useState, type FormEvent } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { ApiError } from "../../config/api";
import { useAuth } from "../auth/context/AuthContext";
import AuthLayout from "../auth/pages/AuthLayout";
import "../auth/pages/AuthPages.css";
import { acceptInvitation, tokenFromFragment } from "./invitationApi";

export default function InvitationAccept({ onAccepted }: { onAccepted?: () => void }) {
  const { status, user, login, register, logout, refreshUser } = useAuth();
  const [token, setToken] = useState(() => tokenFromFragment(window.location.hash));
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirmation: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(false);
  const authenticate = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (registering && form.password !== form.confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    setBusy(true); setError("");
    try {
      if (registering) await register({ displayName: form.displayName, email: form.email, password: form.password });
      else await login({ email: form.email, password: form.password });
      setForm({ displayName: "", email: "", password: "", confirmation: "" });
    } catch (err) { setError(err instanceof Error ? err.message : "Connexion impossible. Réessayez."); }
    finally { setBusy(false); }
  };
  const accept = async () => {
    if (!user || !token || busy) return;
    setBusy(true); setError(""); setAcceptError(false);
    try {
      await acceptInvitation(token, user.id);
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      setToken(null); setAccepted(true); onAccepted?.();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || (err.status === 409 && err.details.code === "SESSION_CHANGED"))) await refreshUser();
      setError(err instanceof Error ? err.message : "Impossible d’accepter l’invitation.");
      setAcceptError(true);
    } finally { setBusy(false); }
  };
  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return <AuthLayout><section className="auth-card" aria-labelledby="invitation-accept-title">
    <h1 id="invitation-accept-title">Invitation à rejoindre un restaurant</h1>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {acceptError && <p>Si l’invitation a déjà été acceptée, vous pouvez <a href="/">ouvrir l’accueil</a> pour vérifier votre accès.</p>}
    {accepted ? <p role="status">Invitation acceptée.</p> : !token ? <p role="alert">Ce lien d’invitation est invalide. Demandez un nouveau lien.</p> : status === "loading" ? <p role="status">Chargement de votre session…</p> : status === "error" ? <div><p>Impossible de vérifier votre session.</p><Button type="button" onClick={() => void refreshUser()}>Réessayer</Button></div> : user ? <>
      <p>Vous êtes connecté avec {user.displayName} ({user.email}).</p><p>En acceptant, vous rejoignez le restaurant associé à ce lien.</p>
      <Button type="button" disabled={busy} onClick={() => void accept()}>{busy ? "Enregistrement…" : "Accepter l’invitation"}</Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => { void logout().catch((err: unknown) => setError(err instanceof Error ? err.message : "Déconnexion impossible.")); }}>Changer de compte</Button>
    </> : <><p className="auth-subtitle">Connectez-vous ou créez un compte pour accepter cette invitation.</p>
      <form className="auth-form" onSubmit={(event) => void authenticate(event)}>
        {registering && <Input id="invite-name" label="Nom affiché" required autoComplete="name" value={form.displayName} disabled={busy} onChange={set("displayName")} />}
        <Input id="invite-email" label="Email" type="email" required autoComplete="email" value={form.email} disabled={busy} onChange={set("email")} />
        <Input id="invite-password" aria-describedby={registering ? "invite-password-help" : undefined} label="Mot de passe" type="password" required minLength={registering ? 10 : undefined} autoComplete={registering ? "new-password" : "current-password"} value={form.password} disabled={busy} onChange={set("password")} />
        {registering && <><small id="invite-password-help">10 caractères minimum.</small><Input id="invite-confirmation" label="Confirmation du mot de passe" type="password" required autoComplete="new-password" value={form.confirmation} disabled={busy} onChange={set("confirmation")} /></>}
        <Button type="submit" disabled={busy}>{busy ? "Veuillez patienter…" : registering ? "Créer mon compte" : "Se connecter"}</Button>
      </form><p className="auth-footer"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setRegistering((value) => !value); setError(""); }}>{registering ? "J’ai déjà un compte" : "Créer un compte"}</button></p></>}
  </section></AuthLayout>;
}
