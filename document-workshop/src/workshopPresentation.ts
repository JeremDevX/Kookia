import type { WorkshopRun } from "../../shared/workshopControl";

export { serviceSlotLabels as serviceLabel } from "../../shared/serviceCalendar";
export const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export { number as quantity } from "./catalog";
const parisTimestamp = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" });
const dateTime = (value: string) => parisTimestamp.format(new Date(value));
export const displayedTime = (value: string | null) => value ? dateTime(value) : "Aucun";

const issueMessage = {
  NETWORK: "Kookia était inaccessible.",
  STOCK_CONFLICT: "Le stock Kookia diffère du stock attendu. Vérifiez les fiches concernées.",
  STOCK_SEQUENCE: "Une clôture de stock manque. Vérifiez la dernière date confirmée.",
  DAY_CONFLICT: "Cette date contient déjà des données différentes dans Kookia.",
  ORDER_CHANGED: "Une commande validée a changé. Vérifiez-la dans Achats.",
  SERVICE_CONFLICT: "Un autre service est déjà enregistré pour cette date.",
  FORECAST: "La prévision du jour n’a pas été reçue par Kookia.",
  INVALID_INPUT: "Données refusées. Vérifiez les réglages avec l’administrateur.",
  INTERRUPTED: "Reprenez depuis la dernière clôture confirmée.",
  UNKNOWN: "Le transfert s’est arrêté. Vérifiez la journée avec l’administrateur.",
} satisfies Record<NonNullable<WorkshopRun["issue"]>["code"], string>;

export function transferIssue(issue: NonNullable<WorkshopRun["issue"]>, canManage: boolean) {
  if (!canManage && (issue.code === "DAY_CONFLICT" || issue.code === "SERVICE_CONFLICT")) {
    return "Cette date contient déjà des données différentes. Prévenez le responsable de l’espace.";
  }
  return issueMessage[issue.code];
}

export function dayHistoryHref(date: string) {
  return `/history?from=${date}&to=${date}`;
}
