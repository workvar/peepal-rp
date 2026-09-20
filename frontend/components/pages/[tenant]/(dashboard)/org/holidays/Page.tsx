"use client";

import Header from "@/components/layout/Header";
import { Plus, Settings, CalendarDays } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { useHolidaysPage } from "./useHolidaysPage";
import HolidayList from "./HolidayList";
import AddHolidayModal from "./AddHolidayModal";
import WeekendRulesModal from "./WeekendRulesModal";
import { AttendanceSettingsModal, CopyToAcademicYearModal } from "./SettingsModals";
import { useTerminology } from "@/store/hooks/useTerminology";

export default function HolidaysPage() {
  const s = useHolidaysPage();
  const { settings, calendarSettings, academicYears, filterAYID, setFilterAYID } = s;
  const t = useTerminology();

  return (
    <div>
      <Header
        title="Holiday Calendar"
        subtitle="Manage institutional and public holidays"
        action={
          <div className="flex gap-2 flex-wrap">
            <button className="btn-secondary flex items-center gap-2" onClick={() => s.setShowWeekend(true)}>
              <CalendarDays size={16} /> Weekend Rules
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => s.setShowSettings(true)}>
              <Settings size={16} /> Attendance Settings
            </button>
            <BulkUploadButton
              resource="holidays"
              onFinished={() => {
                // Clear the AY filter so all uploaded holidays are visible,
                // including ones uploaded without an academic year.
                setFilterAYID("");
              }}
            />
            <button className="btn-primary flex items-center gap-2" onClick={s.openAdd}>
              <Plus size={16} /> Add Holiday
            </button>
          </div>
        }
      />

      {/* Academic year filter */}
      {academicYears.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{t.year}:</span>
          <button
            onClick={() => setFilterAYID("")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterAYID === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          {academicYears.map((ay) => (
            <button
              key={ay.id}
              onClick={() => setFilterAYID(ay.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterAYID === ay.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {ay.name}
            </button>
          ))}
        </div>
      )}

      {/* Settings banners */}
      {calendarSettings && (
        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800 flex gap-4 flex-wrap">
          <span>Sundays: <strong>{calendarSettings.sunday_off ? "Off" : "Working"}</strong></span>
          <span>Saturdays: <strong>{
            calendarSettings.saturday_rule === "all" ? "All off"
            : calendarSettings.saturday_rule === "specific"
              ? (() => {
                  const weeks = (calendarSettings.saturday_weeks || "")
                    .split(",").filter(Boolean)
                    .map((n) => ["1st", "2nd", "3rd", "4th", "5th"][parseInt(n, 10) - 1] || n);
                  return weeks.length ? `${weeks.join(", ")} off` : "Specific (none selected)";
                })()
            : "All working"
          }</strong></span>
        </div>
      )}
      {settings && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex gap-4">
          <span>Min Attendance: <strong>{settings.min_attendance_pct}%</strong></span>
          <span>Grace Period: <strong>{settings.grace_period_minutes} min</strong></span>
          <span>Lock After: <strong>{settings.lock_after_hours}h</strong></span>
        </div>
      )}

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search holiday name, type…"
          value={s.search}
          onChange={(e) => s.setSearch(e.target.value)}
        />
      </div>

      <HolidayList s={s} />

      <AddHolidayModal s={s} />
      <WeekendRulesModal s={s} />
      <AttendanceSettingsModal s={s} />

      <ConfirmDialog state={s.confirmState} onClose={() => s.setConfirmState(null)} />

      <CopyToAcademicYearModal s={s} />
    </div>
  );
}
