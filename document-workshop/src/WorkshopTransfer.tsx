import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { WorkshopControl, WorkshopRun } from "../../shared/workshopControl";
import { requestWorkshopRetry, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate } from "./calendar";
import { dayHistoryHref, displayedDay, displayedTime, transferIssue } from "./workshopPresentation";

const runLabel = { running: "En cours", succeeded: "Terminé", failed: "En échec" };
const stepLabel = { prepare: "Préparer la journée", orders: "Relire les commandes", import: "Transmettre la clôture", forecast: "Publier la prévision" };

function RunIssue({ run, canManage }: { run: WorkshopRun; canManage: boolean }) {
  const issue = run.issue;
  if (run.state !== "failed") return null;
  const link = issue?.code === "ORDER_CHANGED" ? { href: "/orders", label: "Vérifier les achats" }
    : issue?.code === "STOCK_CONFLICT" || issue?.code === "STOCK_SEQUENCE" ? { href: canManage && issue.product ? `/stocks?search=${encodeURIComponent(issue.product)}#stock-search` : "/stocks", label: "Vérifier les stocks" }
      : canManage && run.date ? { href: dayHistoryHref(run.date), label: "Voir la journée dans Kookia" } : null;
  return <div className="workshop-structured">
    <p className="error">
      {run.date && <strong>Le {displayDate(run.date)}. </strong>}
      {issue ? transferIssue(issue, canManage) : "Le transfert s’est arrêté. Relancez depuis la dernière clôture confirmée."}
      {issue?.product && <> Produit concerné · {issue.product}.</>}
    </p>
    {link && <a className="workshop-link" href={link.href}>{link.label}</a>}
  </div>;
}

export default function WorkshopTransfer({ control, onRefresh, onAccessError }: {
  control: WorkshopControl;
  onRefresh: () => void;
  onAccessError: (cause: unknown) => void;
}) {
  const { transfer, restaurant, history, forecast } = control;
  const [submission, setSubmission] = useState<"idle" | "busy" | "queued" | "error">("idle");
  const [requestedAfter, setRequestedAfter] = useState<string | null>(null);
  const run = transfer.lastRun;
  const queued = transfer.retryRequested || (submission === "queued" && requestedAfter === (run?.id ?? null));
  const lastDay = history.find(row => row.date === transfer.lastConfirmedDate);
  const confirmed = lastDay ? ["Ventes", lastDay.stock && "Stocks", lastDay.operations && "Opérations"].filter(Boolean).join(" · ") : null;

  const retry = async () => {
    if (!transfer.canRetry || queued || submission === "busy") return;
    setSubmission("busy");
    setRequestedAfter(run?.id ?? null);
    try {
      await requestWorkshopRetry();
      setSubmission("queued");
      onRefresh();
    } catch (cause) {
      if (workshopAccessError(cause)) onAccessError(cause);
      else { setSubmission("error"); onRefresh(); }
    }
  };

  return <section className="panel workshop-transfer workshop-structured" aria-labelledby="workshop-transfer">
    <div className="workshop-heading">
      <h2 id="workshop-transfer" className="section-heading"><span className="section-icon"><ArrowRightLeft size={18} aria-hidden="true" /></span>Transfert vers Kookia</h2>
      <span role="status" className={run?.state === "failed" || transfer.missedDate ? "workshop-tag workshop-tag-warning" : "workshop-tag"}>
        {queued ? "Relance demandée" : transfer.missedDate ? "Passage non confirmé" : run ? runLabel[run.state] : "Aucun passage enregistré"}
      </span>
    </div>
    <dl className="workshop-facts">
      <div><dt>Espace destinataire</dt><dd>{restaurant.name}</dd></div>
      <div><dt>Données confirmées</dt><dd>{[confirmed, forecast && "Prévision du jour"].filter(Boolean).join(" · ") || "En attente du premier transfert"}</dd></div>
      <div><dt>Dernière clôture confirmée</dt><dd>{displayedDay(transfer.lastConfirmedDate)}</dd></div>
      <div><dt>Dernière réception dans Kookia</dt><dd>{displayedTime(transfer.lastConfirmedAt)}</dd></div>
      <div><dt>Dernier passage</dt><dd>{displayedTime(run?.finishedAt ?? run?.startedAt ?? null)}{run?.state === "running" && run.step && <> · {stepLabel[run.step]}</>}</dd></div>
      <div><dt>Prochaine échéance</dt><dd>{transfer.nextRun ? <time dateTime={`${transfer.nextRun.date}T${transfer.nextRun.time}`}>{displayDate(transfer.nextRun.date)} à {transfer.nextRun.time}</time> : "Non renseignée"}</dd></div>
    </dl>
    {run && <RunIssue run={run} canManage={control.canManage} />}
    {transfer.missedDate && <p className="error">
      <strong>Le {displayDate(transfer.missedDate)}. </strong>
      Aucun transfert confirmé après l’horaire prévu. {control.canManage && (transfer.canRetry || queued)
        ? "La reprise repart de la dernière clôture confirmée." : "Contactez le responsable du transfert."}
    </p>}
    {(transfer.canRetry || queued || submission === "busy") && <div className="workshop-actions">
      <button type="button" aria-disabled={queued || submission === "busy"} onClick={() => void retry()}>
        {submission === "busy" ? "Demande en cours…" : "Relancer le transfert"}
      </button>
      {queued && <p className="hint" role="status">La relance démarrera au prochain passage du service de transfert.</p>}
    </div>}
    {submission === "error" && <p className="error" role="alert">La demande de relance n’a pas pu être confirmée. Vérifiez l’état du transfert puis réessayez.</p>}
  </section>;
}
