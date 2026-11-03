export const weekdays = [[1, "Lundi"], [2, "Mardi"], [3, "Mercredi"], [4, "Jeudi"], [5, "Vendredi"], [6, "Samedi"], [0, "Dimanche"]] as const;

export function formatOpeningWeekdays(value?: number[] | null) {
  return value == null ? "Non renseignés" : value.length === 0 ? "Aucun jour ouvert" : weekdays.filter(([day]) => value.includes(day)).map(([, label]) => label).join(", ");
}

