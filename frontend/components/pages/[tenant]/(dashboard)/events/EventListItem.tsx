"use client";

import type { ReactNode } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import type { EventItem } from "./eventForm";

// One event row, shared by the Upcoming list and the Day view. `subtitle`
// carries whatever context the caller wants under the title (a date, location,
// or "Day 2 of 3").
export default function EventListItem({
  event,
  subtitle,
  isAdmin,
  onEdit,
  onDelete,
}: {
  event: EventItem;
  subtitle?: ReactNode;
  isAdmin: boolean;
  onEdit: (e: EventItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: event.color }}
            />
            <p className="font-semibold text-xs truncate">{event.title}</p>
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
          )}
          <Badge variant="outline" className="mt-2 text-xs capitalize">
            {event.category}
          </Badge>
        </div>

        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <Can module="events" action="edit">
              <button
                onClick={() => onEdit(event)}
                className="p-1.5 hover:bg-primary/10 rounded text-primary transition"
                aria-label="Edit event"
              >
                <Edit2 size={14} />
              </button>
            </Can>
            <Can module="events" action="delete">
              <button
                onClick={() => onDelete(event.id)}
                className="p-1.5 hover:bg-red-500/10 rounded text-red-500 transition"
                aria-label="Delete event"
              >
                <Trash2 size={14} />
              </button>
            </Can>
          </div>
        )}
      </div>
    </div>
  );
}
