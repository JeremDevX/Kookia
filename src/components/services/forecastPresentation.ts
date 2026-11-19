import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { OperationalForecast } from "../../../shared/operationalForecast";
export function selectedForecastService(forecast: OperationalForecast, date: string, slot: ServiceSlot) {
  return forecast.services.find((service) => service.date === date && service.slot === slot) ?? null;
}

export function displayForecastNote(note: string, clientPresentation: boolean) {
  if (!clientPresentation) return note;
  return note.replace("Espace de démonstration : aucune prévision mesurée.", "Historique de ventes insuffisant pour une prévision fiable.")
    .replace("ventes corrigées non revues et simulations exclus.", "ventes corrigées non revues et lignes non confirmées exclus.")
    .replace("La couverture est simulée par date et FEFO", "La couverture est estimée pour chaque date selon l’échéance des lots")
    .replace("Cette projection simulée ne peut pas devenir un achat de l’espace réel.", "Cette estimation ne permet pas de préparer une commande.");
}
