"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCalendarSettings, updateCalendarSettings,
  fetchCalendarMonth, upsertCalendarDay, generateCalendar,
} from "@/store/slices/calendarSlice";
import { fetchHolidays, createHoliday, deleteHoliday } from "@/store/slices/holidaySlice";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Settings, List, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import type { CalendarDay, CalendarDayType, CalendarSettings, HolidayType } from "@/types";

import CalendarGrid from "./CalendarGrid";
import DayEditModal from "./DayEditModal";
import SettingsModal from "./SettingsModal";
import HolidayListModal from "./HolidayListModal";
import MonthYearNav from "./MonthYearNav";
import { DAY_TYPE_LABEL, DAY_TYPE_STYLE } from "./helpers";

// CalendarPage — the admin-facing institutional calendar.
//
// Layout:
//   • Header with "Calendar Settings" + "All Holidays" + "Auto-Generate"
//   • Month switcher (◀ Month/Year ▶)
//   • Clickable month grid — opens DayEditModal on any cell
//   • Legend of day-type colours
export default function CalendarPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { settings, month, loading, saving } = useAppSelector((s) => s.calendar);
  const { holidays } = useAppSelector((s) => s.holiday);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth() + 1); // 1-indexed

  const [editDay, setEditDay] = useState<CalendarDay | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showList, setShowList] = useState(false);

  // ── Data loading ────────────────────────────────────────────
  useEffect(() => { dispatch(fetchCalendarSettings()); }, [dispatch]);
  useEffect(() => { dispatch(fetchCalendarMonth({ year, month: monthIdx })); }, [dispatch, year, monthIdx]);
  // Fetch all holidays (no year filter) so the HolidayListModal shows everything
  // regardless of academic year vs calendar year mismatch.
  useEffect(() => { dispatch(fetchHolidays({})); }, [dispatch]);

  // ── Navigation ──────────────────────────────────────────────
  const jumpTo = (y: number, m: number) => { setYear(y); setMonthIdx(m); };

  // ── Handlers ────────────────────────────────────────────────
  // Both single and double click open the edit modal — single click is the
  // normal quick-edit, double click is muscle-memory from other calendars.
  const handleDayClick = (day: CalendarDay) => setEditDay(day);

  const handleSaveDay = async ({ date, type, name }: { date: string; type: CalendarDayType; name: string }) => {
    const res = await dispatch(upsertCalendarDay({ date, type, name }));
    if (upsertCalendarDay.fulfilled.match(res)) {
      toast.success("Day updated");
      dispatch(fetchCalendarMonth({ year, month: monthIdx }));
      dispatch(fetchHolidays({}));
    } else {
      toast.error(res.payload as string);
    }
  };

  const handleSaveSettings = async (data: Partial<CalendarSettings>) => {
    const res = await dispatch(updateCalendarSettings(data));
    if (updateCalendarSettings.fulfilled.match(res)) toast.success("Settings saved");
    else toast.error(res.payload as string);
  };

  const handleGenerate = async (gYear: number) => {
    const res = await dispatch(generateCalendar(gYear));
    if (generateCalendar.fulfilled.match(res)) {
      const payload = res.payload as { year: number; created: number };
      toast.success(`Added ${payload.created} weekend entries to ${payload.year}`);
      setShowSettings(false);
      if (gYear === year) {
        dispatch(fetchCalendarMonth({ year, month: monthIdx }));
        dispatch(fetchHolidays({}));
      }
    } else {
      toast.error(res.payload as string);
    }
  };

  const handleAddHoliday = async (data: { name: string; date: string; type: HolidayType }) => {
    const res = await dispatch(createHoliday(data));
    if (createHoliday.fulfilled.match(res)) {
      toast.success("Holiday added");
      dispatch(fetchCalendarMonth({ year, month: monthIdx }));
    } else {
      toast.error(res.payload as string);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    const res = await dispatch(deleteHoliday(id));
    if (deleteHoliday.fulfilled.match(res)) {
      toast.success("Holiday removed");
      dispatch(fetchCalendarMonth({ year, month: monthIdx }));
    } else {
      toast.error(res.payload as string);
    }
  };

  // ── Render ──────────────────────────────────────────────────
  const workingDays = month?.working ?? 0;
  const halfDays = month?.half_days ?? 0;
  const target = settings?.default_working ?? 0;

  return (
    <div>
      <Header
        title="Institutional Calendar"
        subtitle="Plan working days, holidays and half days for the year"
        action={
          isAdmin ? (
            <div className="flex gap-2 flex-wrap">
              <button className="btn-secondary flex items-center gap-2" onClick={() => setShowList(true)}>
                <List size={16} /> All Holidays
              </button>
              <button className="btn-secondary flex items-center gap-2" onClick={() => setShowSettings(true)}>
                <Settings size={16} /> Calendar Settings
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => handleGenerate(year)}
                disabled={saving}
              >
                <Sparkles size={16} /> Auto-Generate {year}
              </button>
            </div>
          ) : null
        }
      />

      {/* Settings summary banner — surfaces the rules and links to the modal */}
      {isAdmin && (
        <div
          onClick={() => setShowSettings(true)}
          className="card p-3 mb-4 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition"
        >
          <div className="flex items-center gap-3">
            <Settings size={16} className="text-muted-foreground" />
            <div className="text-xs">
              <p className="font-medium text-sm">Calendar Rules</p>
              <p className="text-muted-foreground">
                {settings
                  ? `Sundays: ${settings.sunday_off ? "off" : "working"} · Saturdays: ${saturdayLabel(settings.saturday_rule, settings.saturday_weeks)}`
                  : "Click to configure Sunday/Saturday rules"}
              </p>
            </div>
          </div>
          <span className="text-xs text-primary">Edit →</span>
        </div>
      )}

      {/* Month switcher + stats */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <MonthYearNav year={year} month={monthIdx} onChange={jumpTo} />
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Working: <strong className="text-foreground">{workingDays}</strong></span>
          <span>Half Days: <strong className="text-foreground">{halfDays}</strong></span>
          {target > 0 && (
            <span>
              Target: <strong className={workingDays < target ? "text-amber-600" : "text-foreground"}>{target}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Filter holidays to the current month so chips only show relevant entries */}
      {loading && !month ? (
        <LoadingSpinner />
      ) : month ? (
        <CalendarGrid
          year={year}
          month={monthIdx}
          days={month.days}
          holidays={holidays.filter((h) => {
            const d = new Date(h.date);
            return d.getFullYear() === year && d.getMonth() + 1 === monthIdx;
          })}
          onDayClick={handleDayClick}
          onDayDoubleClick={handleDayClick}
        />
      ) : (
        <div className="card text-center py-12 text-muted-foreground">No data.</div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(DAY_TYPE_LABEL) as CalendarDayType[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${DAY_TYPE_STYLE[k].dot}`} />
            {DAY_TYPE_LABEL[k]}
          </span>
        ))}
      </div>

      {/* Modals */}
      <DayEditModal
        day={editDay}
        canEdit={isAdmin}
        onClose={() => setEditDay(null)}
        onSave={handleSaveDay}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onGenerate={handleGenerate}
        currentYear={year}
        saving={saving}
      />

      <HolidayListModal
        isOpen={showList}
        onClose={() => setShowList(false)}
        holidays={holidays}
        year={year}
        canEdit={isAdmin}
        onAdd={handleAddHoliday}
        onDelete={handleDeleteHoliday}
      />
    </div>
  );
}

// One-liner description of the Saturday rule, shown in the settings banner.
function saturdayLabel(rule: string, weeks: string): string {
  if (rule === "all") return "every Saturday off";
  if (rule === "none" || !rule) return "none off";
  if (rule === "specific") {
    const parts = (weeks || "").split(",").filter(Boolean);
    if (!parts.length) return "no weeks selected";
    const suffixed = parts.map((n) => ["1st", "2nd", "3rd", "4th", "5th"][parseInt(n, 10) - 1] || n);
    return `${suffixed.join(", ")} Saturday off`;
  }
  return rule;
}
