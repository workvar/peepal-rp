"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { CalendarSettings } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: CalendarSettings | null;
  onSave: (data: Partial<CalendarSettings>) => Promise<void> | void;
  onGenerate: (year: number) => Promise<void> | void;
  currentYear: number;
  saving: boolean;
}

// SettingsModal — the control panel the admin opens from the top-right
// "Calendar Settings" button. From here they configure:
//   • Sundays automatically treated as holidays
//   • Which Saturdays to mark off (all / none / specific week numbers)
//   • Default target working-days per month (informational)
// …and then click "Generate {year}" to expand those rules into actual
// Holiday rows for the whole year.
export default function SettingsModal({
  isOpen, onClose, settings, onSave, onGenerate, currentYear, saving,
}: Props) {
  const [sundayOff, setSundayOff] = useState(true);
  const [satRule, setSatRule] = useState<"none" | "all" | "specific">("none");
  const [satWeeks, setSatWeeks] = useState<Set<number>>(new Set());
  const [working, setWorking] = useState("0");
  const [year, setYear] = useState(currentYear);

  useEffect(() => {
    if (settings) {
      setSundayOff(settings.sunday_off);
      setSatRule(settings.saturday_rule);
      setSatWeeks(new Set(
        (settings.saturday_weeks || "")
          .split(",").map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n)),
      ));
      setWorking(String(settings.default_working ?? 0));
    }
  }, [settings]);

  useEffect(() => { setYear(currentYear); }, [currentYear]);

  const toggleWeek = (w: number) => {
    const next = new Set(satWeeks);
    if (next.has(w)) next.delete(w); else next.add(w);
    setSatWeeks(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      sunday_off: sundayOff,
      saturday_rule: satRule,
      saturday_weeks: [...satWeeks].sort((a, b) => a - b).join(","),
      default_working: parseInt(working, 10) || 0,
    });
  };

  return (
    <Modal title="Calendar Settings" isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Sundays */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
          <div>
            <p className="font-medium text-sm">All Sundays are holidays</p>
            <p className="text-xs text-muted-foreground">
              Mark every Sunday as a weekend closure.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={sundayOff}
            onChange={(e) => setSundayOff(e.target.checked)}
          />
        </label>

        {/* Saturdays */}
        <div className="p-3 rounded-lg bg-muted/40 space-y-3">
          <p className="font-medium text-sm">Saturday rule</p>
          <div className="flex gap-4 text-sm">
            {(["none", "all", "specific"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="satrule"
                  checked={satRule === r}
                  onChange={() => setSatRule(r)}
                />
                <span className="capitalize">{r === "none" ? "None off" : r === "all" ? "All Saturdays off" : "Specific weeks"}</span>
              </label>
            ))}
          </div>
          {satRule === "specific" && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Select which Saturdays of the month are holidays (1st, 2nd, 3rd…).
              </p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWeek(w)}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                      satWeeks.has(w)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted",
                    ].join(" ")}
                  >
                    {["1st", "2nd", "3rd", "4th", "5th"][w - 1]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Target working days */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Target working days per month (optional)
          </label>
          <input
            type="number"
            className="input-field"
            min={0}
            max={31}
            value={working}
            onChange={(e) => setWorking(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Informational only — shown on the calendar so you can balance workload.
            Use 0 to ignore.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            Save Rules
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Generate annual calendar */}
        <div className="border-t border-border pt-4 space-y-2">
          <p className="font-medium text-sm">Auto-generate annual calendar</p>
          <p className="text-xs text-muted-foreground">
            Applies your rules above to every Sat/Sun of the selected year. Manually
            added holidays are always preserved.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              className="input-field w-32"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
            />
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => onGenerate(year)}
              disabled={saving}
            >
              Generate {year}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
