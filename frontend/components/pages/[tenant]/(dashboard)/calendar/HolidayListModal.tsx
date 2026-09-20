"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import type { Holiday, HolidayType } from "@/types";
import { DAY_TYPE_LABEL, formatDateLong } from "./helpers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  holidays: Holiday[];
  year: number;
  onAdd: (data: { name: string; date: string; type: HolidayType }) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  canEdit: boolean;
}

// HolidayListModal — the "bulk holidays" model the user asked for: a quick
// list of every holiday in the year with an inline "add new" row. The same
// data can also be reached by clicking individual days on the calendar.
const ADD_TYPES: HolidayType[] = [
  "public", "institutional", "mandatory", "optional", "half_day",
];

export default function HolidayListModal({
  isOpen, onClose, holidays, year, onAdd, onDelete, canEdit,
}: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<HolidayType>("institutional");
  const [filter, setFilter] = useState("");

  // Reset the add-row when the modal is closed
  useEffect(() => {
    if (!isOpen) {
      setName(""); setDate(""); setType("institutional");
    }
  }, [isOpen]);

  // Defensive against null from the API (Go returns null for empty slices).
  const list = holidays ?? [];
  const filtered = filter
    ? list.filter((h) =>
        h.name.toLowerCase().includes(filter.toLowerCase()) ||
        h.type.toLowerCase().includes(filter.toLowerCase())
      )
    : list;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    await onAdd({ name, date, type });
    setName(""); setDate("");
  };

  return (
    <Modal title={`Holidays — ${year}`} isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {canEdit && (
          <form onSubmit={handleAdd} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <label className="block text-xs font-medium mb-1">Name</label>
              <input
                className="input-field"
                placeholder="Holiday name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                className="input-field"
                value={type}
                onChange={(e) => setType(e.target.value as HolidayType)}
              >
                {ADD_TYPES.map((t) => (
                  <option key={t} value={t}>{DAY_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
          </form>
        )}

        <input
          className="input-field"
          placeholder="Search…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div className="max-h-80 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No holidays match.
            </div>
          ) : (
            filtered
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h) => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateLong(h.date.slice(0, 10))}</p>
                  </div>
                  <Badge label={DAY_TYPE_LABEL[h.type]} variant={badgeVariant(h.type)} />
                  {canEdit && (
                    <button
                      onClick={() => onDelete(h.id)}
                      className="ml-3 text-red-400 hover:text-red-600"
                      title="Remove holiday"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </Modal>
  );
}

function badgeVariant(type: HolidayType) {
  switch (type) {
    case "public":        return "red" as const;
    case "institutional": return "blue" as const;
    case "mandatory":     return "destructive" as const;
    case "optional":      return "warning" as const;
    case "half_day":      return "purple" as const;
    case "weekend":       return "gray" as const;
  }
}
