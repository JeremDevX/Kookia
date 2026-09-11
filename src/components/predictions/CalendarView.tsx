import { useState } from "react";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ArrowUpRight, CalendarDays, AlertTriangle } from "lucide-react";
import { getPredictionPriority } from "../../domain/predictions/prediction.policies";
import type { Prediction } from "../../types";
import "./CalendarView.css";

interface CalendarViewProps {
  predictions: Prediction[];
  onPredictionClick: (prediction: Prediction) => void;
}

const priorityLabels = { critical: "Critique", high: "Important", normal: "Normal" };

export default function CalendarView({ predictions, onPredictionClick }: CalendarViewProps) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [selected, setSelected] = useState(() => new Date());
  const [criticalOnly, setCriticalOnly] = useState(false);
  const start = mode === "week" ? startOfWeek(selected, { weekStartsOn: 1 }) : startOfMonth(selected);
  const end = mode === "week" ? endOfWeek(selected, { weekStartsOn: 1 }) : endOfMonth(selected);
  const gridStart = startOfWeek(start, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(end, { weekStartsOn: 1 });
  const dates = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const periodPredictions = predictions.filter((prediction) => {
    const date = parseISO(prediction.predictedDate);
    return date >= start && date <= end;
  });
  const criticalCount = periodPredictions.filter((prediction) => getPredictionPriority(prediction) === "critical").length;
  const visible = criticalOnly ? predictions.filter((prediction) => getPredictionPriority(prediction) === "critical") : predictions;
  const forDay = (date: Date) => visible.filter((prediction) => isSameDay(parseISO(prediction.predictedDate), date));
  const selectedPredictions = forDay(selected);
  const navigate = (direction: number) => setSelected((date) => mode === "week" ? addWeeks(date, direction) : addMonths(date, direction));
  const periodLabel = mode === "month" ? format(selected, "MMMM yyyy", { locale: fr }) : `${format(start, "d MMM", { locale: fr })} — ${format(end, "d MMM yyyy", { locale: fr })}`;

  return (
    <section className="planning-calendar" aria-label="Calendrier des prévisions">
      <header className="planning-toolbar">
        <div><p className="planning-eyebrow">VOTRE HORIZON</p><h2 aria-live="polite">{periodLabel}</h2></div>
        <div className="planning-controls">
          <div className="planning-modes" aria-label="Période affichée">
            <button aria-pressed={mode === "week"} onClick={() => setMode("week")}>Semaine</button>
            <button aria-pressed={mode === "month"} onClick={() => setMode("month")}>Mois</button>
          </div>
          <div className="planning-navigation">
            <button aria-label={mode === "week" ? "Semaine précédente" : "Mois précédent"} onClick={() => navigate(-1)}><ChevronLeft size={17} /></button>
            <button onClick={() => setSelected(new Date())}>Aujourd’hui</button>
            <button aria-label={mode === "week" ? "Semaine suivante" : "Mois suivant"} onClick={() => navigate(1)}><ChevronRight size={17} /></button>
          </div>
        </div>
      </header>
      <div className="planning-summary">
        <p><strong>{periodPredictions.length}</strong> prévisions sur {mode === "week" ? "la semaine" : "le mois"} <span>· {criticalCount} critiques</span></p>
        <label><input type="checkbox" checked={criticalOnly} onChange={(event) => setCriticalOnly(event.target.checked)} /> Priorités critiques uniquement</label>
      </div>
      <div className="planning-layout">
        <div className="planning-board">
          <div className="planning-weekdays" aria-hidden="true">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className={`planning-days ${mode}`}>
            {dates.map((date) => {
              const items = forDay(date);
              const critical = items.some((item) => getPredictionPriority(item) === "critical");
              return (
                <button key={format(date, "yyyy-MM-dd")} className={`planning-day ${isSameDay(date, selected) ? "selected" : ""} ${mode === "month" && !isSameMonth(date, selected) ? "outside" : ""}`}
                  aria-pressed={isSameDay(date, selected)} aria-current={isToday(date) ? "date" : undefined}
                  aria-label={`${format(date, "EEEE d MMMM yyyy", { locale: fr })}, ${items.length} prévisions${critical ? ", priorité critique" : ""}`}
                  onClick={() => setSelected(date)}
                  onKeyDown={(event) => {
                    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
                    if (offset !== undefined) {
                      event.preventDefault();
                      const next = addDays(date, offset);
                      setSelected(next);
                      requestAnimationFrame(() => document.getElementById(`planning-${format(next, "yyyy-MM-dd")}`)?.focus());
                    }
                  }}
                  id={`planning-${format(date, "yyyy-MM-dd")}`}>
                  <span className="planning-day-top"><span>{format(date, "d")}</span>{critical && <AlertTriangle size={12} aria-hidden="true" />}</span>
                  {isToday(date) && <span className="planning-today">Aujourd’hui</span>}
                  <span className="planning-previews">{items.slice(0, mode === "week" ? 3 : 2).map((item) => <span className={`planning-preview ${getPredictionPriority(item)}`} key={item.id}>{item.productName}</span>)}</span>
                  <span className="planning-count">{items.length ? `${items.length} prév.` : "—"}</span>
                </button>
              );
            })}
          </div>
          <div className="planning-legend"><span>Critique</span><span>Important</span><span>Normal</span></div>
          <p className="planning-help">Sélectionnez une date pour voir les détails. Navigation au clavier avec les flèches.</p>
        </div>
        <aside className="planning-detail" aria-label="Prévisions du jour sélectionné">
          <div className="planning-detail-heading"><CalendarDays size={21} aria-hidden="true" /><div><p>LE DÉTAIL DU JOUR</p><h3>{format(selected, "EEEE d MMMM", { locale: fr })}</h3></div></div>
          <p className="planning-detail-count" role="status">{selectedPredictions.length} prévision{selectedPredictions.length > 1 ? "s" : ""}{criticalOnly ? " critique(s)" : ""}</p>
          {selectedPredictions.length === 0 ? <div className="planning-empty"><CalendarDays size={28} aria-hidden="true" /><h4>{criticalOnly ? "Aucune priorité critique" : "Une journée sans prévision"}</h4><p>{criticalOnly ? "Désactivez le filtre pour consulter toutes les prévisions de cette date." : "Aucune prévision disponible pour cette date. Choisissez un autre jour dans le calendrier."}</p></div> :
            <div className="planning-agenda">{selectedPredictions.map((prediction) => {
              const priority = getPredictionPriority(prediction);
              return <article key={prediction.id} className="planning-item">
                <div className="planning-item-top"><span className={`planning-priority ${priority}`}>{priorityLabels[priority]}</span><span>Confiance {Math.round(prediction.confidence * 100)} %</span></div>
                <h4>{prediction.productName}</h4><p>{prediction.recommendation?.reason || "Aucune explication disponible."}</p>
                <button onClick={() => onPredictionClick(prediction)} aria-label={`Examiner la prévision pour ${prediction.productName}`}>Examiner la prévision <ArrowUpRight size={15} aria-hidden="true" /></button>
              </article>;
            })}</div>}
          <p className="planning-disclaimer">Une prévision n’est pas une commande. Une date passée ne confirme pas une livraison.</p>
        </aside>
      </div>
    </section>
  );
}
