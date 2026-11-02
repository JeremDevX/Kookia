import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import { getRestaurant, type Restaurant } from "../../services/restaurantService";
import { getSuppliers } from "../../services/productService";
import type { Supplier } from "../../types";

export default function SetupReview({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
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
  return <div className="setup-review"><h3>Restaurant</h3><p><strong>{restaurant.name}</strong> · {restaurant.type}</p>
    <p>{[restaurant.address, restaurant.city].filter(Boolean).join(", ")}</p><p>{restaurant.email}{restaurant.phone && ` · ${restaurant.phone}`}</p>
    <p>{restaurant.dailyCovers} couverts moyens par jour · Terrasse : {restaurant.hasTerrace === null ? "non renseignée" : restaurant.hasTerrace ? "oui" : "non"}</p>
    <h3>Fournisseurs</h3>{suppliers.length ? <ul>{suppliers.map((supplier) => <li key={supplier.id}>{supplier.name}</li>)}</ul> : <p>Aucun fournisseur enregistré.</p>}
  </div>;
}
