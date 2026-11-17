import { useEffect, useRef, useState, type RefObject } from "react";
import { consumeFocusRestoreRequest } from "../../utils/focusRestoration";
import { formatDisplayDate as displayDate, formatQuantity } from "../../utils/format";
import Button from "../common/Button";
import { getImpactMonthlyPage, type ImpactMonthlyPeriod, type ImpactMonthlyReport } from "../../services/impactService";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import { formatLossValue, formatMoney } from "./comparisonValues";

const displayMonth = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })
  .format(new Date(`${value}-01T00:00:00.000Z`));

function monthlySales(period: ImpactMonthlyPeriod) {
  const bucket = period.recorded;
  if (!period.hasRecordedData) return "Aucune vente enregistrée";
  if (bucket.menuItemUnits > 0) return `${formatQuantity(bucket.menuItemUnits)} unité(s) saisie(s)`;
  if (bucket.serviceDays.complete > 0) return `0 unité saisie · ${bucket.serviceDays.complete} service(s) complet(s)`;
  return "Aucune vente enregistrée · aucun service complet pour confirmer un zéro";
}

function monthlyCoverage(bucket: ImpactMonthlyPeriod["recorded"]) {
  const days = bucket.serviceDays;
  return `${days.complete} service(s) complet(s) · ${days.partial} à compléter · ${days.coverageMissing} sans état renseigné · ${days.closed} fermé(s) · ${days.unregistered} sans fiche de service`;
}

interface MonthlyReconciliationProps {
  report: ImpactMonthlyReport;
  onPage: (page: number) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function MonthlyReconciliation({ report, onPage, headingRef }: MonthlyReconciliationProps) {
  const { monthly: periods, currency, monthlyPagination: pagination } = report;
  const displayedStart = periods[0]?.month ?? "";
  const displayedEnd = periods[periods.length - 1]?.month ?? "";
  return <>
    <p>Les périodes partielles reprennent uniquement les dates sélectionnées. Les ventes sont des unités d’articles ; un zéro n’est confirmé que par un service complet. Les pertes sont des mouvements déclarés, pas une quantité invendue ; les unités incompatibles sont écartées.</p>
    <h3 ref={headingRef} tabIndex={-1}>Mois affichés : {displayMonth(displayedStart)} – {displayMonth(displayedEnd)}</h3>
    {pagination.pageCount > 1 && <nav className="impact-monthly-navigation" aria-label="Navigation des périodes mensuelles">
      <Button type="button" variant="outline" disabled={!pagination.hasOlder} onClick={() => onPage(pagination.page + 1)}>Mois plus anciens</Button>
      <p aria-live="polite">Page {pagination.page + 1} sur {pagination.pageCount}</p>
      <Button type="button" variant="outline" disabled={!pagination.hasNewer} onClick={() => onPage(pagination.page - 1)}>Mois plus récents</Button>
    </nav>}
    <div className="sales-table-wrap" role="region" aria-label="Réconciliation mensuelle des indicateurs opérationnels"
      aria-describedby="impact-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table impact-monthly-table" aria-label="Détails mensuels des ventes, services, pertes et réceptions"><thead><tr>
        <th scope="col">Mois et période</th><th scope="col">Ventes (unités)</th><th scope="col">Services renseignés</th>
        <th scope="col">Pertes déclarées</th><th scope="col">Réceptions confirmées</th>
      </tr></thead><tbody>{periods.map((period) => <tr key={period.month}>
        <th scope="row">{displayMonth(period.month)}<br /><small>{displayDate(period.from)} – {displayDate(period.to)} ({period.calendarDays} j)</small></th>
        <td><p>{monthlySales(period)}</p></td>
        <td>{period.recorded.serviceDays.complete} complets<details><summary>Détail des services</summary><p>{monthlyCoverage(period.recorded)}</p></details></td>
        <td><p>{period.recorded.lossMovementCount > 0 && `${period.recorded.lossMovementCount} mouvement(s) · `}{!period.recorded.lossMovementCount && period.excluded.lossUnitMismatch ? "Pertes exclues pour unité incompatible" : formatLossValue(period.recorded.lossMovementCount, period.recorded.unpricedLossMovementCount, period.recorded.knownLossCost, currency)}</p>
          {period.excluded.lossUnitMismatch > 0 && <p>{period.excluded.lossUnitMismatch} mouvement(s) de perte écarté(s) pour unité incompatible</p>}
          {period.excluded.receiptUnitMismatch > 0 && <p>{period.excluded.receiptUnitMismatch} ligne(s) de réception écartée(s) pour unité incompatible</p>}</td>
        <td><p>{period.recorded.receiptCount ? `${period.recorded.receiptCount} réception(s) · ${formatMoney(period.recorded.receivedCost, currency)}` : "Aucune réception enregistrée"}</p>
        </td>
      </tr>)}</tbody></table>
    </div>
  </>;
}

type MonthlyRequest = { page: number };
type MonthlyResult = { request: MonthlyRequest } & ({ report: ImpactMonthlyReport } | { error: string });

export default function MonthlyImpactPanel({ from, to }: { from: string; to: string }) {
  const [request, setRequest] = useState<MonthlyRequest | null>(null);
  const [result, setResult] = useState<MonthlyResult | null>(null);
  const settled = result?.request === request ? result : null;
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const focusPending = useRef(false);

  useEffect(() => {
    if (!request) return;
    let active = true;
    void getImpactMonthlyPage(from, to, request.page).then((report) => {
      if (active) setResult({ request, report });
    }).catch((cause: unknown) => {
      if (active) setResult({ request, error: cause instanceof Error ? cause.message : "Réessayez." });
    });
    return () => { active = false; };
  }, [from, to, request]);
  useEffect(() => {
    if (!settled || !consumeFocusRestoreRequest(focusPending) || !disclosureRef.current?.open) return;
    if ("error" in settled) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [settled]);

  const loadPage = (page: number) => {
    focusPending.current = disclosureRef.current?.contains(document.activeElement) ?? false;
    setRequest({ page });
  };

  return <details ref={disclosureRef} className="impact-monthly-summary bilan-drilldown" onToggle={(event) => {
    if (event.currentTarget.open) setRequest((current) => current ?? { page: 0 });
  }}>
    <summary>Évolution mois par mois</summary>
    {request && !settled && <p role="status">Chargement des chiffres par mois…</p>}
    {settled && ("error" in settled ? <div role="alert"><p>Chiffres par mois indisponibles. {settled.error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={() => loadPage(settled.request.page)}>Réessayer</Button>
    </div> : <MonthlyReconciliation report={settled.report} onPage={loadPage} headingRef={headingRef} />)}
  </details>;
}
