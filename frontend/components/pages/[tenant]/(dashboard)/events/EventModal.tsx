"use client";

import { Calendar, MapPin, Repeat, Tag, Globe, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogDivider,
  DialogBody,
  DialogFooter,
  DialogField,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { presetColors, type CategoryOption, type EventForm } from "./eventForm";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface EventModalProps {
  open: boolean;
  editingId: string | null;
  form: EventForm;
  categories: CategoryOption[];
  onChange: (patch: Partial<EventForm>) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving?: boolean;
}

// Small labelled heading shown at the top of each pane.
function PaneTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export default function EventModal({
  open,
  editingId,
  form,
  categories,
  onChange,
  onClose,
  onSubmit,
  saving = false,
}: EventModalProps) {
  const isEditing = Boolean(editingId);
  const eventCategories = categories;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" accent={isEditing ? "cyan" : "violet"} onClose={onClose}>
        <DialogHeader
          icon={<Calendar size={18} style={{ color: isEditing ? "#0891b2" : "#1f5d36" }} />}
        >
          <DialogTitle>{isEditing ? "Edit Event" : "New Event"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this event."
              : "Fill in the details to add it to the calendar."}
          </DialogDescription>
        </DialogHeader>
        <DialogDivider />

        <form onSubmit={onSubmit}>
          <DialogBody>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* ── Left pane: the what & when ──────────────────────────── */}
              <div className="space-y-4 md:pr-8 md:border-r md:border-border/60">
                <PaneTitle icon={<Calendar size={13} />}>Event Details</PaneTitle>

                <DialogField label="Title" required>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={form.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="e.g. Annual Sports Day"
                    className="input-field"
                  />
                </DialogField>

                <DialogField label="Description">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Optional details about the event"
                    className="input-field !h-auto min-h-[76px] py-2 leading-snug resize-none"
                  />
                </DialogField>

                <div className="grid grid-cols-2 gap-3">
                  <DialogField label="Start Date" required>
                    <input
                      type="date"
                      required
                      value={form.eventDate}
                      onChange={(e) => onChange({ eventDate: e.target.value })}
                      className="input-field"
                    />
                  </DialogField>
                  <DialogField label="End Date" required>
                    <input
                      type="date"
                      required
                      value={form.endDate}
                      onChange={(e) => onChange({ endDate: e.target.value })}
                      className="input-field"
                    />
                  </DialogField>
                </div>

                <DialogField label="Location">
                  <div className="relative">
                    <MapPin
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => onChange({ location: e.target.value })}
                      placeholder="e.g. Main Auditorium"
                      className="input-field pl-9"
                    />
                  </div>
                </DialogField>
              </div>

              {/* ── Right pane: categorisation & options ────────────────── */}
              <div className="space-y-4 md:pl-8 mt-6 md:mt-0">
                <PaneTitle icon={<Tag size={13} />}>Category &amp; Options</PaneTitle>

                <DialogField label="Category">
                  <SearchableSelect
                    value={form.category}
                    onChange={(v) => onChange({ category: v })}
                    options={eventCategories.map((c) => ({ value: c.value, label: c.label }))}
                    placeholder="Select category"
                  />
                </DialogField>

                <DialogField label="Color">
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((color) => {
                      const selected = form.color === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Select color ${color}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onChange({ color })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                            selected
                              ? "ring-2 ring-offset-2 ring-foreground ring-offset-background scale-110"
                              : "hover:scale-105"
                          }`}
                        >
                          {selected && <Check size={15} className="text-white drop-shadow" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </DialogField>

                {/* Public toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <Globe size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium leading-none">Public event</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Visible to everyone on the calendar
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.isPublic}
                    onCheckedChange={(v) => onChange({ isPublic: v })}
                  />
                </div>

                {/* Recurrence — only available when creating */}
                {!isEditing && (
                  <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Repeat size={14} className="text-muted-foreground" />
                      <p className="text-sm font-medium">Repeat</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={form.repeatFreq}
                        onChange={(e) =>
                          onChange({ repeatFreq: e.target.value as EventForm["repeatFreq"] })
                        }
                        className="input-field"
                      >
                        <option value="none">Does not repeat</option>
                        <option value="weekly">Every week</option>
                        <option value="monthly">Every month</option>
                        <option value="yearly">Every year</option>
                      </select>
                      {form.repeatFreq !== "none" && (
                        <input
                          type="number"
                          min={1}
                          max={52}
                          value={form.repeatCount}
                          onChange={(e) =>
                            onChange({ repeatCount: parseInt(e.target.value, 10) || 1 })
                          }
                          placeholder="Occurrences"
                          className="input-field"
                        />
                      )}
                    </div>
                    {form.repeatFreq !== "none" && (
                      <p className="text-xs text-muted-foreground">
                        Creates {form.repeatCount} occurrence{form.repeatCount === 1 ? "" : "s"}, one{" "}
                        {form.repeatFreq === "weekly"
                          ? "per week"
                          : form.repeatFreq === "monthly"
                          ? "per month"
                          : "per year"}
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : isEditing ? (
                "Update Event"
              ) : (
                "Create Event"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
