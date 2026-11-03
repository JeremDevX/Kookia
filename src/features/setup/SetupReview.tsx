import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import { formatOpeningWeekdays } from "../../components/common/openingWeekdaysUtils";
import { getRestaurant, type Restaurant } from "../../services/restaurantService";
import { getSuppliers } from "../../services/productService";
import type { Supplier } from "../../types";
import { useAuth } from "../auth/context/AuthContext";

export default function SetupReview({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<{ restaurant: Restaurant; suppliers: Supplier[] } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([getRestaurant(), getSuppliers()]).then(([restaurant, suppliers]) => {
      if (active) { setData({ restaurant, suppliers }); onReadyChange(true); }
    }, () => { if (active) { setError(true); onReadyChange(false); } });
    return () => { active = false; };
  }, [attempt, onReadyChange]);
  if (error) return <div role="alert"><p>Les informations enregistrées sont indisponibles.</p><Button type="button" variant="outline" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Réessayer</Button></div>;
  if (!data) return <p role="status">Chargement des informations enregistrées…</p>;
  const { restaurant, suppliers } = data;
  return <div className="setup-review">
    <section className="setup-review-restaurant" aria-labelledby="review-restaurant"><h3 id="review-restaurant">{restaurant.name}</h3>
      <dl><div><dt>Type d’établissement</dt><dd>{restaurant.type}</dd></div>
        <div><dt>Couverts moyens par jour</dt><dd>{restaurant.dailyCovers}</dd></div>
        <div><dt>Adresse</dt><dd>{[restaurant.address, restaurant.city].filter(Boolean).join(", ")}</dd></div>
        <div><dt>Contact</dt><dd>{restaurant.email}{restaurant.phone && ` · ${restaurant.phone}`}</dd></div>
        <div><dt>Terrasse</dt><dd>{restaurant.hasTerrace === null ? "Non renseignée" : restaurant.hasTerrace ? "Oui" : "Non"}</dd></div>
        <div><dt>Jours d’ouverture</dt><dd>{formatOpeningWeekdays(restaurant.openingWeekdays)}</dd></div></dl>
    </section>
    <div className="setup-review-columns"><section aria-labelledby="review-team"><h3 id="review-team">Équipe</h3>
      <p>Compte propriétaire : {user?.displayName} · {user?.email}</p><p>Les membres et invitations sont disponibles à l’étape Équipe.</p></section>
      <section aria-labelledby="review-suppliers"><h3 id="review-suppliers">Fournisseurs</h3>
        {suppliers.length ? <ul>{suppliers.map((supplier) => <li key={supplier.id}>{supplier.name}</li>)}</ul> : <p>Aucun fournisseur enregistré.</p>}</section></div>
  </div>;
}
