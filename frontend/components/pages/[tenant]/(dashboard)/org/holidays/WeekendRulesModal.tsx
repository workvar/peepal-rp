"use client";

import Modal from "@/components/ui/Modal";
import Switch from "@/components/ui/switch";
import type { HolidaysPageState, SaturdayRule } from "./useHolidaysPage";

// Weekend Rules modal: Sunday toggle plus a Saturday rule with optional
// per-week selection when the "specific" rule is chosen.
export default function WeekendRulesModal({ s }: { s: HolidaysPageState }) {
  const { showWeekend, setShowWeekend, weekendForm, setWeekendForm } = s;
  return (
    <Modal title="Weekend Rules" isOpen={showWeekend} onClose={() => setShowWeekend(false)}>
      <form onSubmit={s.handleSaveWeekend} className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="font-medium text-sm text-foreground">All Sundays off</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mark every Sunday as a non-working day</p>
          </div>
          <Switch
            checked={weekendForm.sunday_off}
            onCheckedChange={(v) => setWeekendForm((f) => ({ ...f, sunday_off: v }))}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Saturday rule</p>
          <div className="space-y-2">
            {(
              [
                { value: "none", label: "All Saturdays working", desc: "No Saturdays are marked as holidays" },
                { value: "all", label: "All Saturdays off", desc: "Every Saturday is a non-working day" },
                { value: "specific", label: "Custom Saturdays", desc: "Choose which Saturdays of the month are off" },
              ] as { value: SaturdayRule; label: string; desc: string }[]
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  weekendForm.saturday_rule === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="saturday_rule"
                  value={opt.value}
                  checked={weekendForm.saturday_rule === opt.value}
                  onChange={() => setWeekendForm((f) => ({ ...f, saturday_rule: opt.value }))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {weekendForm.saturday_rule === "specific" && (
            <div className="mt-3 px-1">
              <p className="text-xs text-muted-foreground mb-2">Select which Saturdays are off:</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => s.toggleSaturdayWeek(w)}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                      weekendForm.saturday_weeks.has(w)
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

        <div className="flex gap-3 pt-1">
          <button type="submit" className="btn-primary flex-1">Save</button>
          <button type="button" className="btn-secondary flex-1" onClick={() => setShowWeekend(false)}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
