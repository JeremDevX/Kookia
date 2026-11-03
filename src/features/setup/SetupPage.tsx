import { Fragment, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import OpeningWeekdays from "../../components/common/OpeningWeekdays";
import { ApiError } from "../../config/api";
import { returnTo } from "../auth/returnTo";
import { useAuth } from "../auth/context/AuthContext";
import "../auth/pages/AuthPages.css";
import "./SetupPage.css";
import { setupValues } from "./setupLogic";
import { createSetup, type SetupProgress } from "./setupApi";
import SetupSteps from "./SetupSteps";
import SetupProgressIndicator from "./SetupProgressIndicator";
import SetupHeader from "./SetupHeader";
import { clearSetupDraft, emptySetupForm, readSetupDraft, saveSetupDraft } from "./setupDraft";

type Field = keyof typeof emptySetupForm;

export default function SetupPage() {
  const { user } = useAuth();
  const progress = useOutletContext<SetupProgress>();
  return progress.configured ? <SetupSteps key={user?.id} initialProgress={progress} /> : <SetupForm key={user?.id} />;
}

function SetupForm() {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState(() => user ? readSetupDraft(user.id) : { ...emptySetupForm });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const set = <K extends Field,>(field: K, value: (typeof form)[K]) => { const next = { ...form, [field]: value }; if (user) saveSetupDraft(user.id, next); setForm(next); setFields((current) => ({ ...current, [field]: "" })); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !user) return;
    if (form.dailyCovers.trim() === "") { setFields({ dailyCovers: "Indiquez le nombre de couverts." }); return; }
    setSaving(true); setError(""); setFields({});
    try {
      await createSetup(setupValues(form), user.id, refreshUser);
      if (user) clearSetupDraft(user.id);
      navigate(returnTo(location.state), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible. Réessayez.");
      if (err instanceof ApiError) setFields(err.details.fields ?? {});
    } finally { setSaving(false); }
  };
  return <main className="setup-page">
    <SetupHeader step={1} />
    <div className="setup-content">
      <h1 id="setup-title">Configurez votre restaurant</h1>
      <p className="setup-subtitle">Étape 1 sur 4 · Renseignez les informations de votre établissement.</p>
      <SetupProgressIndicator index={0} />
      <section className="setup-card" aria-labelledby="setup-card-title">
        <header className="setup-card-heading"><h2 id="setup-card-title">Votre restaurant</h2><p>Renseignez les informations utiles à votre établissement.</p></header>
        <form className="auth-form setup-form" onSubmit={submit}>
      {error && <p className="auth-error setup-wide" role="alert">{error}</p>}
      {([
        ["name", "Nom du restaurant", "text", 120, true],
        ["type", "Type d’établissement", "text", 120, true],
        ["address", "Adresse (facultatif)", "text", 300, false],
        ["city", "Ville", "text", 120, true],
        ["email", "Email de contact", "email", 254, true],
        ["phone", "Téléphone (facultatif)", "tel", 40, false],
      ] as const).map(([field, label, type, maxLength, required]) => <Fragment key={field}><Input id={`setup-${field}`} label={label} type={type} maxLength={maxLength} required={required} disabled={saving} value={form[field]} error={fields[field]} onChange={(event) => set(field, event.target.value)} />
        {field === "type" && <Input id="setup-covers" label="Couverts moyens par jour" type="number" min={0} max={100000} step={1} required disabled={saving} value={form.dailyCovers} error={fields.dailyCovers} onChange={(event) => set("dailyCovers", event.target.value)} />}</Fragment>)}
      <div className="input-wrapper"><label className="input-label" htmlFor="setup-terrace">Terrasse</label>
        <select id="setup-terrace" className="input-field" disabled={saving} value={form.hasTerrace} onChange={(event) => set("hasTerrace", event.target.value)}>
          <option value="">Non renseigné</option><option value="yes">Oui</option><option value="no">Non</option>
        </select>
      </div>
      <OpeningWeekdays value={form.openingWeekdays} disabled={saving} onChange={value => set("openingWeekdays", value)} />
          <div className="setup-actions setup-wide">
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => { void logout().then(() => { if (user) clearSetupDraft(user.id); navigate("/login", { replace: true, state: location.state }); }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Déconnexion impossible. Réessayez.")); }}>Se déconnecter</button>
            <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Créer mon établissement"}</Button>
          </div>
        </form>
      </section>
    </div>
  </main>;
}
