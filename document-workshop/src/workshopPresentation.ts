import type { WorkshopRun } from "../../shared/workshopControl";
import { displayDate } from "./calendar";

export { serviceSlotLabels as serviceLabel } from "../../shared/serviceCalendar";
export const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export { number as quantity } from "./catalog";
const parisTimestamp = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" });
const dateTime = (value: string) => parisTimestamp.format(new Date(value));
export const displayedDay = (value: string | null) => value ? displayDate(value) : "Aucune";
export const displayedTime = (value: string | null) => value ? dateTime(value) : "Aucun";

const issueMessage = {
  NETWORK: "Kookia n’a pas pu être joint. Réessayez le transfert.",
  STOCK_CONFLICT: "Le stock enregistré diffère du stock attendu. Vérifiez les mouvements et le solde avant de relancer.",
  STOCK_SEQUENCE: "Une clôture de stock manque. Vérifiez la dernière date confirmée avant de relancer.",
  DAY_CONFLICT: "Cette date contient déjà des données différentes. Vérifiez la journée dans l’historique Kookia avant de relancer.",
  ORDER_CHANGED: "Une commande validée a changé. Vérifiez-la dans Achats, puis relancez pour relire les commandes.",
  SERVICE_CONFLICT: "Cette date contient déjà un service différent. Vérifiez-le dans Kookia avant de relancer.",
  FORECAST: "La prévision du jour n’a pas été confirmée. Réessayez le transfert.",
  INVALID_INPUT: "Le transfert a été refusé. Vérifiez la date concernée et les réglages avec l’administrateur.",
  INTERRUPTED: "Le transfert s’est interrompu. Relancez depuis la dernière clôture confirmée.",
  UNKNOWN: "Le transfert s’est arrêté. Vérifiez la date concernée avec l’administrateur avant de relancer.",
} satisfies Record<NonNullable<WorkshopRun["issue"]>["code"], string>;

export function transferIssue(issue: NonNullable<WorkshopRun["issue"]>, canManage: boolean) {
  if (!canManage && (issue.code === "DAY_CONFLICT" || issue.code === "SERVICE_CONFLICT")) {
    return "Cette date contient déjà des données différentes. Demandez au responsable de l’espace de vérifier la journée dans Kookia.";
  }
  return issueMessage[issue.code];
}

export function dayHistoryHref(date: string) {
  return `/history?from=${date}&to=${date}`;
}
