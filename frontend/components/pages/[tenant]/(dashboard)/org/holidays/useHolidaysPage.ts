"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchHolidays, createHoliday, deleteHoliday,
  bulkDeleteHolidays, copyHolidaysToAcademicYear,
  fetchAttendanceSettings, updateAttendanceSettings,
} from "@/store/slices/holidaySlice";
import {
  fetchCalendarSettings, updateCalendarSettings, generateCalendar,
} from "@/store/slices/calendarSlice";
import { fetchAcademicYears } from "@/store/slices/orgSlice";
import toast from "react-hot-toast";
import type { Holiday } from "@/types";
import { type ConfirmState } from "@/components/ui/ConfirmDialog";

export type SaturdayRule = "none" | "all" | "specific";

// All holidays page state and handlers; the page, list, and modals consume
// this hook so they stay purely presentational.
export function useHolidaysPage() {
  const dispatch = useAppDispatch();
  const { holidays, settings, loading } = useAppSelector((s) => s.holiday);
  const calendarSettings = useAppSelector((s) => s.calendar.settings);
  const { academicYears } = useAppSelector((s) => s.org);

  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWeekend, setShowWeekend] = useState(false);
  const [isRange, setIsRange] = useState(false);

  // Multi-select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetAY, setCopyTargetAY] = useState("");

  // Active filter — null means "all / current year"
  const [filterAYID, setFilterAYID] = useState<string>("");

  const [form, setForm] = useState({
    name: "", date: "", start_date: "", end_date: "", type: "institutional",
    academic_year_id: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    min_attendance_pct: "75",
    grace_period_minutes: "10",
    lock_after_hours: "24",
  });
  const [weekendForm, setWeekendForm] = useState({
    sunday_off: true,
    saturday_rule: "none" as SaturdayRule,
    saturday_weeks: new Set<number>(),
  });
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchAttendanceSettings());
    dispatch(fetchCalendarSettings());
    dispatch(fetchAcademicYears());
  }, [dispatch]);

  // Refetch whenever the academic year filter changes.
  useEffect(() => {
    if (filterAYID) {
      dispatch(fetchHolidays({ academic_year_id: filterAYID }));
    } else {
      dispatch(fetchHolidays({}));
    }
  }, [dispatch, filterAYID]);

  // Pre-select the current academic year if one exists.
  useEffect(() => {
    if (academicYears.length > 0 && filterAYID === "") {
      const current = academicYears.find((ay) => ay.is_current);
      if (current) setFilterAYID(current.id);
    }
  }, [academicYears]);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        min_attendance_pct: String(settings.min_attendance_pct),
        grace_period_minutes: String(settings.grace_period_minutes),
        lock_after_hours: String(settings.lock_after_hours),
      });
    }
  }, [settings]);

  useEffect(() => {
    if (calendarSettings) {
      const weeks = new Set<number>(
        (calendarSettings.saturday_weeks || "")
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n >= 1 && n <= 5),
      );
      setWeekendForm({
        sunday_off: calendarSettings.sunday_off,
        saturday_rule: (calendarSettings.saturday_rule as SaturdayRule) || "none",
        saturday_weeks: weeks,
      });
    }
  }, [calendarSettings]);

  // Default the form's academic year to the active filter.
  const openAdd = () => {
    setForm((f) => ({ ...f, academic_year_id: filterAYID || "" }));
    setShowAdd(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = isRange
      ? {
          name: form.name, start_date: form.start_date, end_date: form.end_date,
          type: form.type, academic_year_id: form.academic_year_id,
        }
      : {
          name: form.name, date: form.date,
          type: form.type, academic_year_id: form.academic_year_id,
        };

    const result = await dispatch(createHoliday(payload));
    if (createHoliday.fulfilled.match(result)) {
      toast.success("Holiday added");
      setShowAdd(false);
      setIsRange(false);
      // Refresh to pick up single or multi-day ranges.
      dispatch(fetchHolidays(filterAYID ? { academic_year_id: filterAYID } : {}));
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Remove Holiday",
      message: "This holiday will be permanently removed from the calendar.",
      variant: "danger",
      confirmLabel: "Remove",
      onConfirm: async () => {
        await dispatch(deleteHoliday(id));
        toast.success("Holiday removed");
      },
    });
  };

  // Computed list (used by both select-all and the rendered list)
  const displayedHolidays = search
    ? holidays.filter((h) =>
        [h.name, h.type, new Date(h.date).toLocaleDateString()].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : holidays;

  // Multi-select helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === displayedHolidays.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayedHolidays.map((h) => h.id)));
    }
  };

  const handleBulkDelete = () => {
    const ids = [...selected];
    setConfirmState({
      title: `Remove ${ids.length} Holiday${ids.length > 1 ? "s" : ""}`,
      message: `This will permanently remove ${ids.length} selected holiday${ids.length > 1 ? "s" : ""}.`,
      variant: "danger",
      confirmLabel: "Remove All",
      onConfirm: async () => {
        const result = await dispatch(bulkDeleteHolidays(ids));
        if (bulkDeleteHolidays.fulfilled.match(result)) {
          toast.success(`${ids.length} holiday${ids.length > 1 ? "s" : ""} removed`);
          setSelected(new Set());
        } else {
          toast.error(result.payload as string);
        }
      },
    });
  };

  const handleCopyToAY = async () => {
    if (!copyTargetAY) return;
    const ids = [...selected];
    const result = await dispatch(copyHolidaysToAcademicYear({ ids, targetAcademicYearId: copyTargetAY }));
    if (copyHolidaysToAcademicYear.fulfilled.match(result)) {
      const { copied } = result.payload as { copied: number };
      toast.success(`${copied} holiday${copied !== 1 ? "s" : ""} copied`);
      setShowCopyModal(false);
      setSelected(new Set());
      setCopyTargetAY("");
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(updateAttendanceSettings({
      min_attendance_pct: parseFloat(settingsForm.min_attendance_pct),
      grace_period_minutes: parseInt(settingsForm.grace_period_minutes),
      lock_after_hours: parseInt(settingsForm.lock_after_hours),
    }));
    if (updateAttendanceSettings.fulfilled.match(result)) {
      toast.success("Settings saved");
      setShowSettings(false);
    } else {
      toast.error("Failed to save settings");
    }
  };

  const toggleSaturdayWeek = (w: number) => {
    setWeekendForm((f) => {
      const next = new Set(f.saturday_weeks);
      if (next.has(w)) next.delete(w); else next.add(w);
      return { ...f, saturday_weeks: next };
    });
  };

  const handleSaveWeekend = async (e: React.FormEvent) => {
    e.preventDefault();
    const satWeeks =
      weekendForm.saturday_rule === "specific"
        ? [...weekendForm.saturday_weeks].sort((a, b) => a - b).join(",")
        : "";
    const result = await dispatch(updateCalendarSettings({
      sunday_off: weekendForm.sunday_off,
      saturday_rule: weekendForm.saturday_rule,
      saturday_weeks: satWeeks,
    }));
    if (updateCalendarSettings.fulfilled.match(result)) {
      toast.success("Weekend rules saved");
      setShowWeekend(false);
      // Auto-populate the calendar for the current year.
      const year = new Date().getFullYear();
      const genResult = await dispatch(generateCalendar(year));
      if (generateCalendar.fulfilled.match(genResult)) {
        const p = genResult.payload as { year: number; created: number };
        if (p.created > 0) toast.success(`Calendar updated: ${p.created} entries added for ${p.year}`);
      }
    } else {
      toast.error("Failed to save weekend rules");
    }
  };

  // Group the visible holidays by "Month Year" for the sectioned list.
  const byMonth = displayedHolidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const month = new Date(h.date).toLocaleString("default", { month: "long", year: "numeric" });
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  return {
    settings, calendarSettings, academicYears, loading,
    showAdd, setShowAdd, showSettings, setShowSettings, showWeekend, setShowWeekend,
    isRange, setIsRange, selected, setSelected, showCopyModal, setShowCopyModal,
    copyTargetAY, setCopyTargetAY, filterAYID, setFilterAYID,
    form, setForm, settingsForm, setSettingsForm, weekendForm, setWeekendForm,
    confirmState, setConfirmState, search, setSearch,
    openAdd, handleAdd, handleDelete, displayedHolidays, toggleSelect, toggleSelectAll,
    handleBulkDelete, handleCopyToAY, handleSaveSettings, toggleSaturdayWeek,
    handleSaveWeekend, byMonth,
  };
}

export type HolidaysPageState = ReturnType<typeof useHolidaysPage>;
