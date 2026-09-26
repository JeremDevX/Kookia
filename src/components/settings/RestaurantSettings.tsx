import { useEffect, useRef, useState, type FormEvent } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { getRestaurant, saveRestaurant, type Restaurant } from "../../services/restaurantService";

export default function RestaurantSettings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const retryFocusPending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getRestaurant().then((data) => { if (active) setRestaurant(data); }, (error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Restaurant indisponible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [error, loading, restaurant]);
  const retryLoad = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setReload((value) => value + 1);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!restaurant || saving) return;
    setSaving(true); setError(""); setNotice("");
    try { setRestaurant(await saveRestaurant(restaurant)); setNotice("Informations du restaurant enregistrées."); }
    catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  return <Card title="Établissement">
    <p>Vérifiez les informations de l’établissement avant de les utiliser pour vos achats.</p>
    {error && <div role="alert"><p>{error}</p>{!restaurant && <Button ref={retryButtonRef} type="button" variant="outline" disabled={loading} onClick={retryLoad}>Réessayer</Button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {!restaurant ? loading && <p role="status">Chargement du restaurant…</p> : <form ref={formRef} onSubmit={submit} className="form-grid">
      {([['name', 'Nom du restaurant'], ['type', 'Type d’établissement'], ['address', 'Adresse'], ['city', 'Ville'], ['phone', 'Téléphone'], ['email', 'Email de contact']] as const).map(([field, label]) => <Input key={field} id={`restaurant-${field}`} label={label} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={restaurant[field]} required={field !== "phone" && field !== "address"} disabled={saving} onChange={(event) => setRestaurant({ ...restaurant, [field]: event.target.value })} />)}
      <Input id="restaurant-covers" label="Couverts moyens par jour" type="number" min={0} max={100000} step={1} required value={restaurant.dailyCovers} disabled={saving} onChange={(event) => setRestaurant({ ...restaurant, dailyCovers: Number(event.target.value) })} />
      <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>}
  </Card>;
}
