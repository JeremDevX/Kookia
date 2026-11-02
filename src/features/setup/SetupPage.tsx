import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { ApiError } from "../../config/api";
import { useCart } from "../../context/useCart";
import { returnTo } from "../auth/returnTo";
import { useAuth } from "../auth/context/AuthContext";
import AuthLayout from "../auth/pages/AuthLayout";
import "../auth/pages/AuthPages.css";
import "./SetupPage.css";
import { setupValues } from "./setupLogic";
import { createSetup } from "./setupApi";
import { clearSetupDraft, emptySetupForm, readSetupDraft, saveSetupDraft } from "./setupDraft";

type Field = keyof typeof emptySetupForm;

export default function SetupPage() {
  const { user } = useAuth();
  return <SetupForm key={user?.id} />;
}

function SetupForm() {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState(() => user ? readSetupDraft(user.id) : { ...emptySetupForm });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { refreshCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const set = (field: Field, value: string) => { const next = { ...form, [field]: value }; if (user) saveSetupDraft(user.id, next); setForm(next); setFields((current) => ({ ...current, [field]: "" })); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !user) return;
    if (form.dailyCovers.trim() === "") { setFields({ dailyCovers: "Indiquez le nombre de couverts." }); return; }
    setSaving(true); setError(""); setFields({});
    try {
      await createSetup(setupValues(form), user.id, refreshUser);
      if (user) clearSetupDraft(user.id);
      await refreshCart();
      navigate(returnTo(location.state), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible. Réessayez.");
      if (err instanceof ApiError) setFields(err.details.fields ?? {});
    } finally { setSaving(false); }
  };
  return <AuthLayout><section className="auth-card setup-card" aria-labelledby="setup-title">
    <h1 id="setup-title">Configurer votre restaurant</h1>
    <p className="auth-subtitle">Renseignez les informations de votre établissement pour commencer.</p>
    <form className="auth-form setup-form" onSubmit={submit}>
      {error && <p className="auth-error setup-wide" role="alert">{error}</p>}
      {([
        ["name", "Nom du restaurant", "text", 120, true],
        ["type", "Type d’établissement", "text", 120, true],
        ["address", "Adresse (facultatif)", "text", 300, false],
        ["city", "Ville", "text", 120, true],
        ["email", "Email de contact", "email", 254, true],
        ["phone", "Téléphone (facultatif)", "tel", 40, false],
      ] as const).map(([field, label, type, maxLength, required]) => <Input key={field} id={`setup-${field}`} label={label} type={type} maxLength={maxLength} required={required} disabled={saving} value={form[field]} error={fields[field]} onChange={(event) => set(field, event.target.value)} />)}
      <Input id="setup-covers" label="Couverts moyens par jour" type="number" min={0} max={100000} step={1} required disabled={saving} value={form.dailyCovers} error={fields.dailyCovers} onChange={(event) => set("dailyCovers", event.target.value)} />
      <div className="input-wrapper"><label className="input-label" htmlFor="setup-terrace">Terrasse</label>
        <select id="setup-terrace" className="input-field" disabled={saving} value={form.hasTerrace} onChange={(event) => set("hasTerrace", event.target.value)}>
          <option value="">Non renseigné</option><option value="yes">Oui</option><option value="no">Non</option>
        </select>
      </div>
      <Button className="setup-wide" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Créer mon établissement"}</Button>
    </form>
    <p className="auth-footer"><button type="button" className="btn btn-ghost" disabled={saving} onClick={() => { if (user) clearSetupDraft(user.id); void logout().then(() => navigate("/login", { replace: true, state: location.state })).catch(() => setError("Déconnexion impossible. Réessayez.")); }}>Se déconnecter</button></p>
  </section></AuthLayout>;
}
