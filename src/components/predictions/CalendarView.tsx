import React, { useState } from "react";
import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
  addDays,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  getDay,
  getDaysInMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Package,
  Calendar,
} from "lucide-react";
import Button from "../common/Button";
import type { Prediction } from "../../types";

interface CalendarViewProps {
  predictions: Prediction[];
  onOrderClick?: (prediction: Prediction) => void;
}

/**
 * Premium Calendar View for Kitchen Staff
 * Hybrid layout with interactive day selection
 * Supports weekly and monthly views
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  predictions,
  onOrderClick,
}) => {
  // View mode: 'week' or 'month'
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // Track which day is selected/featured
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(currentWeekStart, i)
  );

  // Weekly navigation
  const goToPreviousWeek = () =>
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Monthly navigation
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate month days for the calendar grid
  const getMonthDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDay = getDay(monthStart); // 0 = Sunday
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1; // Adjust for Monday start

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < adjustedStartDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    const daysInMonth = getDaysInMonth(currentMonth);
    for (let i = 0; i < daysInMonth; i++) {
      days.push(addDays(monthStart, i));
    }

    return days;
  };

  // Handle day selection
  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Check if a day is selected
  const isDaySelected = (date: Date) => isSameDay(date, selectedDate);

  // Get predictions for a specific day
  const getDayPredictions = (date: Date) => {
    return predictions.filter((p) =>
      isSameDay(parseISO(p.predictedDate), date)
    );
  };

  // Get urgency level
  const getUrgencyLevel = (pred: Prediction) => {
    if (pred.confidence > 0.9) return "critical";
    if (pred.confidence > 0.8) return "high";
    return "normal";
  };

  // Check if a day is in the past
  const isDayPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Week summary stats
  const weekStats = {
    totalItems: predictions.filter((p) =>
      weekDays.some((d) => isSameDay(parseISO(p.predictedDate), d))
    ).length,
    criticalItems: predictions.filter(
      (p) =>
        weekDays.some((d) => isSameDay(parseISO(p.predictedDate), d)) &&
        p.confidence > 0.9
    ).length,
  };

  const selectedPreds = getDayPredictions(selectedDate);
  const isSelectedToday = isToday(selectedDate);
  const isSelectedPast = isDayPast(selectedDate);

  return (
    <div className="calendar-premium">
      {/* View Mode Toggle & Navigation Header */}
      <div className="calendar-header">
        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`view-toggle-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Semaine
          </button>
          <button
            className={`view-toggle-btn ${
              viewMode === "month" ? "active" : ""
            }`}
            onClick={() => setViewMode("month")}
          >
            Mois
          </button>
        </div>

        <div className="calendar-nav">
          <Button
            variant="outline"
            size="sm"
            onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar size={14} style={{ marginRight: 6 }} />
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={viewMode === "week" ? goToNextWeek : goToNextMonth}
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        <h2 className="calendar-title">
          {viewMode === "week"
            ? `Semaine du ${format(currentWeekStart, "d MMMM yyyy", {
                locale: fr,
              })}`
            : format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h2>

        <div className="week-summary">
          <div className="summary-stat">
            <Package size={16} />
            <span>
              <strong>{weekStats.totalItems}</strong> commandes
            </span>
          </div>
          {weekStats.criticalItems > 0 && (
            <div className="summary-stat critical">
              <AlertTriangle size={16} />
              <span>
                <strong>{weekStats.criticalItems}</strong> urgentes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hybrid Layout: Featured Day + Grid (Week View Only) */}
      {viewMode === "week" && (
        <div className="calendar-hybrid-layout">
          {/* Featured Day (Selected) */}
          <div className="featured-day-section">
            <div
              className={`featured-day-card ${
                isSelectedToday ? "is-today" : ""
              } ${isSelectedPast ? "is-past" : ""}`}
              key={selectedDate.toISOString()} // Key for animation
            >
              <div
                className={`featured-header ${
                  isSelectedPast ? "past-header" : ""
                }`}
              >
                <div className="featured-date">
                  <span className="featured-day-name">
                    {format(selectedDate, "EEEE", { locale: fr })}
                  </span>
                  <span className="featured-day-number">
                    {format(selectedDate, "d")}
                  </span>
                  <span className="featured-month">
                    {format(selectedDate, "MMMM", { locale: fr })}
                  </span>
                </div>
                {isSelectedToday && (
                  <span className="today-badge-large">Aujourd'hui</span>
                )}
                {isSelectedPast && (
                  <span className="past-badge-large">Passé</span>
                )}
              </div>

              <div className="featured-content">
                {selectedPreds.length === 0 ? (
                  <div className="empty-featured">
                    <CheckCircle size={32} />
                    <h4>Aucune commande</h4>
                    <p>
                      {isSelectedPast
                        ? "Aucune commande était prévue"
                        : "Tout est en ordre pour ce jour"}
                    </p>
                  </div>
                ) : (
                  <div className="featured-predictions">
                    {selectedPreds.map((pred) => {
                      const urgency = getUrgencyLevel(pred);
                      return (
                        <div
                          key={pred.id}
                          className={`featured-pred-item ${urgency} ${
                            isSelectedPast ? "delivered" : ""
                          }`}
                          onClick={() => onOrderClick?.(pred)}
                        >
                          <div className="pred-left">
                            <span className="pred-name">
                              {pred.productName}
                            </span>
                            <span className="pred-reason">
                              {pred.recommendation?.reason}
                            </span>
                          </div>
                          <div className="pred-right">
                            <span className="pred-qty">
                              {pred.recommendation?.quantity}
                              <span className="unit">u</span>
                            </span>
                            <span className={`pred-badge ${urgency}`}>
                              {isSelectedPast
                                ? "Livré ✓"
                                : urgency === "critical"
                                ? "URGENT"
                                : urgency === "high"
                                ? "Important"
                                : "Normal"}
                            </span>
                          </div>
                          {!isSelectedPast && urgency === "critical" && (
                            <button className="quick-order-btn">
                              <ShoppingCart size={14} />
                              Commander
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="featured-footer">
                <span>
                  {selectedPreds.length} article
                  {selectedPreds.length !== 1 ? "s" : ""}
                </span>
                <span className="confidence-avg">
                  {isSelectedPast
                    ? "Complété"
                    : `Fiabilité moy: ${
                        selectedPreds.length > 0
                          ? Math.round(
                              (selectedPreds.reduce(
                                (s, p) => s + p.confidence,
                                0
                              ) /
                                selectedPreds.length) *
                                100
                            )
                          : 0
                      }%`}
                </span>
              </div>
            </div>
          </div>

          {/* Week Days Grid */}
          <div className="other-days-section">
            <h3 className="other-days-title">Semaine</h3>
            <div className="other-days-grid">
              {weekDays.map((date) => {
                const dayPreds = getDayPredictions(date);
                const dayIsToday = isToday(date);
                const dayIsPast = isDayPast(date);
                const hasCritical = dayPreds.some((p) => p.confidence > 0.9);
                const isSelected = isDaySelected(date);

                return (
                  <div
                    key={date.toISOString()}
                    className={`mini-day-card ${dayIsPast ? "past" : ""} ${
                      hasCritical ? "has-critical" : ""
                    } ${dayIsToday ? "is-today" : ""} ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => handleDaySelect(date)}
                  >
                    <div className="mini-day-header">
                      <span className="mini-day-name">
                        {format(date, "EEE", { locale: fr })}
                      </span>
                      <span className="mini-day-number">
                        {format(date, "d")}
                      </span>
                      {hasCritical && !dayIsPast && (
                        <span className="mini-critical-badge">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                      {dayIsToday && (
                        <span className="mini-today-badge">Auj.</span>
                      )}
                    </div>

                    <div className="mini-day-content">
                      {dayPreds.length === 0 ? (
                        <span className="mini-empty">—</span>
                      ) : (
                        <div className="mini-predictions">
                          {dayPreds.slice(0, 3).map((pred) => (
                            <div
                              key={pred.id}
                              className={`mini-pred ${getUrgencyLevel(pred)}`}
                            >
                              <span className="mini-pred-name">
                                {pred.productName}
                              </span>
                              <span className="mini-pred-qty">
                                {pred.recommendation?.quantity}u
                              </span>
                            </div>
                          ))}
                          {dayPreds.length > 3 && (
                            <span className="mini-more">
                              +{dayPreds.length - 3} autres
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mini-day-footer">{dayPreds.length} cmd</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Monthly View */}
      {viewMode === "month" && (
        <div className="monthly-view">
          {/* Day of week headers */}
          <div className="month-header-row">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div key={day} className="month-day-header">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="month-grid">
            {getMonthDays().map((date, index) => {
              if (!date) {
                return (
                  <div key={`empty-${index}`} className="month-cell empty" />
                );
              }

              const dayPreds = getDayPredictions(date);
              const dayIsToday = isToday(date);
              const dayIsPast = isDayPast(date);
              const hasCritical = dayPreds.some((p) => p.confidence > 0.9);
              const hasHigh = dayPreds.some(
                (p) => p.confidence > 0.8 && p.confidence <= 0.9
              );
              const isSelected = isSameDay(date, selectedDate);

              return (
                <div
                  key={date.toISOString()}
                  className={`month-cell ${dayIsPast ? "past" : ""} ${
                    dayIsToday ? "today" : ""
                  } ${isSelected ? "selected" : ""} ${
                    hasCritical ? "has-critical" : hasHigh ? "has-high" : ""
                  }`}
                  onClick={() => {
                    handleDaySelect(date);
                    setViewMode("week");
                    setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                  }}
                >
                  <span className="month-day-number">{format(date, "d")}</span>

                  {dayPreds.length > 0 && (
                    <div className="month-day-info">
                      <span
                        className={`month-count ${
                          hasCritical ? "critical" : hasHigh ? "high" : "normal"
                        }`}
                      >
                        {dayPreds.length}
                      </span>
                      {hasCritical && (
                        <AlertTriangle size={10} className="month-alert" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Monthly Legend */}
          <div className="month-legend">
            <div className="month-legend-item">
              <div className="month-legend-dot critical"></div>
              <span>Urgences</span>
            </div>
            <div className="month-legend-item">
              <div className="month-legend-dot high"></div>
              <span>Important</span>
            </div>
            <div className="month-legend-item">
              <div className="month-legend-dot normal"></div>
              <span>Normal</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend (week view only) */}
      {viewMode === "week" && (
        <div className="calendar-legend">
          <div className="legend-item critical">
            <span className="legend-dot"></span>
            Critique (&gt;90%)
          </div>
          <div className="legend-item high">
            <span className="legend-dot"></span>
            Important (80-90%)
          </div>
          <div className="legend-item normal">
            <span className="legend-dot"></span>
            Normal (&lt;80%)
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
