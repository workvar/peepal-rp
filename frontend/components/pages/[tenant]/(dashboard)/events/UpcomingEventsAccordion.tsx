"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AccordionCard from "./AccordionCard";
import EventListItem from "./EventListItem";
import { fullDate, spanDays } from "./eventDates";
import type { EventItem } from "./eventForm";

// Collapsed-by-default list of the next events, sorted by start date.
export default function UpcomingEventsAccordion({
  events,
  loading,
  isAdmin,
  onEdit,
  onDelete,
}: {
  events: EventItem[];
  loading: boolean;
  isAdmin: boolean;
  onEdit: (e: EventItem) => void;
  onDelete: (id: string) => void;
}) {
  const upcoming = events
    .slice()
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 10);

  return (
    <AccordionCard title="Upcoming Events" count={upcoming.length} bodyClassName="max-h-72">
      {loading ? (
        <LoadingSpinner />
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">No upcoming events.</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((event) => {
            const days = spanDays(event);
            return (
              <EventListItem
                key={event.id}
                event={event}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
                subtitle={
                  <>
                    {fullDate(event.eventDate)}
                    {days > 1 && <span> · {days} days</span>}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </AccordionCard>
  );
}
