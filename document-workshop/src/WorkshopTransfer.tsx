import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import type { WorkshopControl, WorkshopRun } from "../../shared/workshopControl";
import { requestWorkshopRetry, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate } from "./calendar";
import { dayHistoryHref, displayedDay, displayedTime, transferIssue } from "./workshopPresentation";

const runLabel = { running: "En cours", succeeded: "Dernier passage réussi", failed: "Transfert bloqué" };
const stepLabel = { prepare: "Préparer la journée", orders: "Relire les commandes", import: "Transmettre la clôture", forecast: "Publier la prévision" };

function RunIssue({ run, canManage }: { run: WorkshopRun; canManage: boolean }) {
  const issue = run.issue;
  if (run.state !== "failed") return null;
  const link = issue?.code === "ORDER_CHANGED" ? { href: "/orders", label: "Vérifier les achats" }
    : issue?.code === "STOCK_CONFLICT" || issue?.code === "STOCK_SEQUENCE" ? { href: canManage && issue.product ? `/stocks?search=${encodeURIComponent(issue.product)}#stock-search` : "/stocks", label: "Vérifier les stocks" }
      : canManage && run.date ? { href: dayHistoryHref(run.date), label: "Voir la journée dans Kookia" } : null;
  return <div>
    {run.date && <strong>Journée du {displayDate(run.date)}</strong>}
    <p>{issue?.product && <strong>{issue.product}. </strong>}
      {issue ? transferIssue(issue, canManage) : "Reprenez depuis la dernière clôture confirmée."}
    </p>
    {link && <a className="workshop-link" href={link.href}>{link.label}</a>}
  </div>;
}

export default function WorkshopTransfer({ control, onRefresh, onAccessError }: {
  control: WorkshopControl;
  onRefresh: () => void;
  onAccessError: (cause: unknown) => void;
}) {
  const { transfer, restaurant, history } = control;
  const [submission, setSubmission] = useState<"idle" | "busy" | "queued" | "error">("idle");
  const [requestedAfter, setRequestedAfter] = useState<string | null>(null);
  const run = transfer.lastRun;
  const lastPassage = displayedTime(run?.finishedAt ?? run?.startedAt ?? null);
  const lastReceipt = transfer.lastConfirmedAt ? displayedTime(transfer.lastConfirmedAt) : null;
  const queued = transfer.retryRequested || (submission === "queued" && requestedAfter === (run?.id ?? null));
  const needsAttention = run?.state === "failed" || Boolean(transfer.missedDate);
  const StatusIcon = queued ? Clock3 : needsAttention ? AlertCircle : run?.state === "succeeded" ? CheckCircle2 : Clock3;
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

  return <section className="panel workshop-transfer" aria-labelledby="workshop-transfer">
    <div className="workshop-heading">
      <div>
        <h2 id="workshop-transfer">Transfert vers Kookia</h2>
        <p className="workshop-subtitle">{restaurant.name}</p>
      </div>
      <span role="status" className={needsAttention && !queued ? "workshop-tag workshop-tag-warning" : "workshop-tag"}>
        <StatusIcon size={16} aria-hidden="true" />
        {queued ? "Relance demandée" : transfer.missedDate ? "Passage manqué" : run ? runLabel[run.state] : "En attente du premier passage"}
      </span>
    </div>
    {needsAttention && <div className="transfer-alert">
      {run && <RunIssue run={run} canManage={control.canManage} />}
      {transfer.missedDate && <div>
        <strong>Journée du {displayDate(transfer.missedDate)}</strong>
        <p>Aucun transfert à l’heure prévue. {control.canManage && (transfer.canRetry || queued)
          ? "La reprise repart de la dernière clôture." : "Contactez le responsable du transfert."}</p>
      </div>}
      {(transfer.canRetry || queued || submission === "busy") && <button type="button" aria-disabled={queued || submission === "busy"} onClick={() => void retry()}>
        {submission === "busy" ? "Demande en cours…" : "Relancer le transfert"}
      </button>}
      {queued && <p role="status">La relance est en attente du prochain passage.</p>}
      {submission === "error" && <p role="alert">Relance non confirmée. Réessayez.</p>}
    </div>}
    <dl className="transfer-timeline">
      <div><dt>Dernière clôture</dt><dd>{displayedDay(transfer.lastConfirmedDate)}</dd>
        {confirmed && <dd className="transfer-meta">{confirmed}</dd>}
        {lastReceipt && lastReceipt !== lastPassage && <dd className="transfer-meta">Reçue le {lastReceipt}</dd>}</div>
      <div><dt>Dernier passage</dt><dd>{lastPassage}</dd>
        {run?.state === "running" && run.step && <dd className="transfer-meta">{stepLabel[run.step]}</dd>}</div>
      <div><dt>Prochain transfert</dt><dd>{transfer.nextRun ? <time dateTime={`${transfer.nextRun.date}T${transfer.nextRun.time}`}>{displayDate(transfer.nextRun.date)} à {transfer.nextRun.time}</time> : "Non planifié"}</dd>
        {transfer.nextRun && <dd className="transfer-meta">Heure de Paris</dd>}</div>
    </dl>
  </section>;
}
