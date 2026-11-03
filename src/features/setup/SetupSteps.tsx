import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import { ApiError } from "../../config/api";
import SupplierSettings from "../../components/settings/SupplierSettings";
import { useAuth } from "../auth/context/AuthContext";
import { returnTo } from "../auth/returnTo";
import { changeSetupStep, checkSetup, type SetupProgress, type SetupStep } from "./setupApi";
import SetupReview from "./SetupReview";
import InvitationManager from "../invitations/InvitationManager";
import MemberManager from "../members/MemberManager";
import SetupProgressIndicator from "./SetupProgressIndicator";
import SetupHeader from "./SetupHeader";

const labels = ["Restaurant", "Équipe", "Fournisseurs", "Finalisation"];
const indices: Record<SetupStep, number> = { team: 1, suppliers: 2, review: 3 };

export default function SetupSteps({ initialProgress }: { initialProgress: SetupProgress }) {
  const { user, refreshUser, logout } = useAuth();
  const [progress, setProgress] = useState(initialProgress);
  const [busy, setBusy] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(false);
  const [pendingLink, setPendingLink] = useState(false);
  const [reviewReady, setReviewReady] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(0);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const step = progress.step;
  const previousStep = useRef(step);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (step && step !== previousStep.current) heading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const applyProgress = (result: SetupProgress) => {
    if (!result.configured) { setError("L’établissement est indisponible. Réessayez."); return; }
    if (result.step === null) navigate(returnTo(location.state), { replace: true });
    else { setReviewReady(false); setReviewVersion((value) => value + 1); setProgress(result); }
  };
  const resync = async () => {
    if (!user || busy) return;
    setBusy(true); setError("");
    try { applyProgress(await checkSetup(user.id, refreshUser)); }
    catch (err) { setError(err instanceof Error ? err.message : "Vérification impossible. Réessayez."); }
    finally { setBusy(false); }
  };
  const move = async (next: SetupStep | null) => {
    if (!user || !step || busy || editingSupplier || pendingLink || (step === "review" && !reviewReady && next === null)) return;
    setBusy(true); setError("");
    try { applyProgress(await changeSetupStep(user.id, step, next, progress.revision, refreshUser)); }
    catch (err) { setError(err instanceof Error ? err.message : "Enregistrement impossible. Réessayez."); }
    finally { setBusy(false); }
  };
  if (!step) return null;
  const index = indices[step];
  const previous: SetupStep | null = step === "review" ? "suppliers" : step === "suppliers" ? "team" : null;
  const next: SetupStep | null = step === "team" ? "suppliers" : step === "suppliers" ? "review" : null;
  return <main className="setup-page"><SetupHeader step={index + 1} />
    <div className="setup-content"><h1>Configurez votre restaurant</h1><p className="setup-subtitle">Étape {index + 1} sur 4 · {labels[index]}</p>
      <SetupProgressIndicator index={index} />
      <section className={`setup-card setup-step setup-step-${step}`} aria-labelledby="setup-step-title"><header className="setup-card-heading"><h2 ref={heading} tabIndex={-1} id="setup-step-title">{step === "team" ? "Invitez votre équipe" : step === "review" ? "Tout est prêt pour démarrer" : labels[index]}</h2><p>{step === "team" ? "Partagez la gestion de votre restaurant avec votre équipe." : step === "suppliers" ? "Ajoutez vos fournisseurs maintenant ou continuez sans en ajouter." : "Vérifiez vos informations avant de finaliser la configuration."}</p></header>
        {step === "team" && <><div className="setup-owner"><span className="setup-owner-avatar" aria-hidden="true">{user?.displayName.trim().charAt(0).toLocaleUpperCase("fr-FR")}</span><div><strong>{user?.displayName}</strong><span>{user?.email}</span></div><span className="setup-owner-role">Propriétaire</span></div><InvitationManager onPendingLinkChange={setPendingLink} /><MemberManager /></>}
        {step === "suppliers" && <SupplierSettings onEditingChange={setEditingSupplier} />}
        {step === "review" && <SetupReview key={reviewVersion} onReadyChange={setReviewReady} />}
        {error && <div role="alert"><p>{error}</p><Button type="button" variant="outline" disabled={busy} onClick={() => void resync()}>Vérifier l’avancement</Button></div>}
        {pendingLink && <p>Copiez le lien puis sélectionnez « J’ai terminé » pour continuer.</p>}
        {editingSupplier && <p>Enregistrez ou annulez la modification du fournisseur pour continuer.</p>}
        <div className="setup-actions"><div>{previous && <Button type="button" variant="outline" disabled={busy || editingSupplier || pendingLink || !!error} onClick={() => void move(previous)}>Retour</Button>}</div>
          <Button type="button" disabled={busy || editingSupplier || pendingLink || !!error || (step === "review" && !reviewReady)} onClick={() => void move(next)}>{busy ? "Enregistrement…" : step === "team" ? "Continuer" : step === "review" ? "Terminer la configuration" : "Continuer"}</Button></div>
      </section><p className="auth-footer"><button type="button" className="btn btn-ghost" disabled={busy || editingSupplier || pendingLink} onClick={() => { void logout().then(() => navigate("/login", { replace: true, state: location.state })).catch(async (err: unknown) => { if (err instanceof ApiError && (err.status === 401 || (err.status === 409 && err.details.code === "SESSION_CHANGED"))) await refreshUser(); setError(err instanceof Error ? err.message : "Déconnexion impossible. Réessayez."); }); }}>Se déconnecter</button></p>
    </div></main>;
}
