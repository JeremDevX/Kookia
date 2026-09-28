import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import { confirmWeatherLocation, getWeatherLocation, searchWeatherPlaces } from "../../services/weatherService";
import type { WeatherLocationState, WeatherPlace } from "../../../shared/serviceWeather";
import "../services/ServiceWeather.css";

export default function WeatherLocationSettings({ onConfirmed }: { onConfirmed: () => void }) {
  const [location, setLocation] = useState<WeatherLocationState | null>(null);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<WeatherPlace[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const requestId = useRef(0);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const locationHeading = useRef<HTMLHeadingElement>(null);
  const queryInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setBusy(true); setError(""); setStatus("");
    try {
      const result = await getWeatherLocation();
      if (request !== requestId.current) return;
      setLocation(result); setQuery(result.city); setPlaces(null); setSelectedId(null);
    } catch (cause) { if (request === requestId.current) setError(cause instanceof Error ? cause.message : "Localisation indisponible."); }
    finally { if (request === requestId.current) setBusy(false); }
  }, []);
  useEffect(() => { void load(); const revision = requestId; return () => { revision.current++; }; }, [load]);
  const search = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    const request = ++requestId.current;
    setBusy(true); setError(""); setStatus(""); setPlaces(null); setSelectedId(null);
    const origin = document.activeElement;
    try {
      const result = await searchWeatherPlaces(query.trim());
      if (request !== requestId.current) return;
      setPlaces(result.places);
      requestAnimationFrame(() => { if (request === requestId.current && document.activeElement === origin) resultsHeading.current?.focus(); });
    } catch (cause) { if (request === requestId.current) setError(cause instanceof Error ? cause.message : "Recherche indisponible."); }
    finally { if (request === requestId.current) setBusy(false); }
  };
  const confirm = async () => {
    if (!location || selectedId === null || busy) return;
    const request = ++requestId.current;
    setBusy(true); setError(""); setStatus("");
    try {
      const saved = await confirmWeatherLocation({ placeId: selectedId, expectedRevision: location.revision, addressFingerprint: location.addressFingerprint });
      onConfirmed();
      if (request !== requestId.current) return;
      setLocation(saved); setEditing(false); setPlaces(null); setSelectedId(null); setStatus("Commune enregistrée.");
      requestAnimationFrame(() => { if (request === requestId.current) locationHeading.current?.focus(); });
    } catch (cause) { if (request === requestId.current) setError(cause instanceof Error ? cause.message : "Confirmation impossible."); }
    finally { if (request === requestId.current) setBusy(false); }
  };
  return <Card>
    <h2 id="weather-location-title" ref={locationHeading} tabIndex={-1}>Commune pour la météo</h2>
    <p>La météo couvre toute la journée, à l’échelle de votre commune.</p>
    {busy && <p role="status">Chargement…</p>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {location && <>
      {location.status === "confirmed" && location.position && <p>Commune confirmée : <strong>{location.position.place.name}</strong> · {location.position.place.region} · {location.position.place.country}.</p>}
      {location.status === "needs_review" && <p role="status">Les informations du restaurant ont changé. Confirmez à nouveau sa commune.</p>}
      {!location.configured ? <p>La connexion météo n’est pas activée. Vos services restent accessibles sans météo.</p> : location.status === "confirmed" && !editing ?
        <Button type="button" variant="outline" onClick={() => { setEditing(true); setStatus(""); requestAnimationFrame(() => queryInput.current?.focus()); }}>Changer de commune</Button> : <>
        <form className="weather-location-form" onSubmit={event => void search(event)}>
          <label htmlFor="weather-place-query">Commune ou code postal</label>
          <input id="weather-place-query" ref={queryInput} required minLength={2} maxLength={120} value={query} disabled={busy}
            onChange={event => { setQuery(event.target.value); setPlaces(null); setSelectedId(null); setStatus(""); }} />
          <Button type="submit" variant="outline" disabled={busy || query.trim().length < 2}>Rechercher une commune</Button>
        </form>
        {places && <div>
          <h3 ref={resultsHeading} tabIndex={-1}>Communes trouvées</h3>
          {!places.length && <p>Aucune commune trouvée. Précisez la recherche avec la région ou le pays.</p>}
          <ul className="weather-place-options">{places.map(place => <li key={place.id}><label>
            <input type="radio" name="weather-place" value={place.id} checked={selectedId === place.id} disabled={busy || place.timezone !== "Europe/Paris"}
              onChange={() => { setSelectedId(place.id); setStatus(""); }} />
            <span>{place.name} · {place.region} · {place.country}{place.timezone !== "Europe/Paris" && " — fuseau non pris en charge"}</span>
          </label></li>)}</ul>
          {places.length > 0 && <Button type="button" disabled={busy || selectedId === null} onClick={() => void confirm()}>Confirmer cette commune</Button>}
        </div>}
        {location.status === "confirmed" && <Button type="button" variant="outline" disabled={busy} onClick={() => {
          setEditing(false); setPlaces(null); setSelectedId(null); setError("");
          requestAnimationFrame(() => locationHeading.current?.focus());
        }}>Annuler le changement</Button>}
      </>}
    </>}
    {error && <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>Recharger la localisation</Button>}
    <p><small>Localisation : <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> / <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>.</small></p>
  </Card>;
}
