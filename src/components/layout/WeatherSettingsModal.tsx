import { lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import Modal from "../common/Modal";
import { useSharedServiceWeather } from "../../features/services/weather.context";

const WeatherSettingsContent = lazy(() => import("./WeatherSettingsContent"));

export default function WeatherSettingsModal() {
  const weather = useSharedServiceWeather();
  if (!weather.settingsOpen) return null;
  return createPortal(<div className="weather-modal-root"><Modal isOpen onClose={weather.closeSettings} title="Météo et réglages" width="md">
    <Suspense fallback={<p role="status">Chargement des réglages météo…</p>}><WeatherSettingsContent /></Suspense>
  </Modal></div>, document.body);
}
