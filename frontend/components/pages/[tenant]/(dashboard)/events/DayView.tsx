"use client";

import { MapPin } from "lucide-react";
import AccordionCard from "./AccordionCard";
import EventListItem from "./EventListItem";
import { coversDate, dayPosition, longDate } from "./eventDates";
import type { EventItem } from "./eventForm";

// Events for a single selected day. Open by default, fills the remaining height
// of the column, and scrolls internally so it never outgrows the calendar.
export default function DayView({
  date,
  events,
  isAdmin,
  onEdit,
  onDelete,
}: {
  date: string; // YYYY-MM-DD
  events: EventItem[];
  isAdmin: boolean;
  onEdit: (e: EventItem) => void;
  onDelete: (id: string) => void;
}) {
  const dayEvents = events
    .filter((e) => coversDate(e, date))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  return (
    <AccordionCard
      title={longDate(date)}
      count={dayEvents.length}
      defaultOpen
      fill
      bodyClassName="max-h-96 lg:max-h-none"
    >
      {dayEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">No events on this day.</p>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((event) => {
            const pos = dayPosition(event, date);
            return (
              <EventListItem
                key={event.id}
                event={event}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
                subtitle={
                  <div className="space-y-0.5">
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="shrink-0" />
                        {event.location}
                      </span>
                    )}
                    {pos && (
                      <span className="text-primary font-medium">
                        Day {pos.index} of {pos.total}
                      </span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </AccordionCard>
  );
}
