import { useEffect, useState, type FormEvent } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { getRestaurant, saveRestaurant, type Restaurant } from "../../services/restaurantService";

export default function RestaurantSettings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    getRestaurant().then((data) => { if (active) setRestaurant(data); }, (error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Restaurant indisponible."); });
    return () => { active = false; };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!restaurant || saving) return;
    setSaving(true); setError(""); setNotice("");
    try { setRestaurant(await saveRestaurant(restaurant)); setNotice("Informations du restaurant enregistrées."); }
    catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  return <Card title="Votre restaurant">
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!restaurant ? !error && <p role="status">Chargement du restaurant…</p> : <form onSubmit={submit} className="form-grid">
      {([['name', 'Nom du restaurant'], ['type', 'Type d’établissement'], ['address', 'Adresse'], ['city', 'Ville'], ['phone', 'Téléphone'], ['email', 'Email de contact']] as const).map(([field, label]) => <Input key={field} id={`restaurant-${field}`} label={label} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={restaurant[field]} required={field !== "phone" && field !== "address"} disabled={saving} onChange={(event) => setRestaurant({ ...restaurant, [field]: event.target.value })} />)}
      <Input id="restaurant-covers" label="Couverts moyens par jour" type="number" min={0} max={100000} step={1} required value={restaurant.dailyCovers} disabled={saving} onChange={(event) => setRestaurant({ ...restaurant, dailyCovers: Number(event.target.value) })} />
      <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>}
  </Card>;
}
