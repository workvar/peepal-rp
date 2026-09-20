"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { useTenantType } from "@/store/hooks/useTerminology";
import { LIST_EVENTS, LIST_EVENT_CATEGORIES } from "@/graphql/queries/events";
import { CREATE_EVENT, UPDATE_EVENT, DELETE_EVENT } from "@/graphql/mutations/events";
import Header from "@/components/layout/Header";
import toast from "react-hot-toast";
import { Plus, Upload, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import EventModal from "./EventModal";
import BulkEventModal from "./BulkEventModal";
import CategoryManagerModal from "./CategoryManagerModal";
import BulkEventCategoryModal from "./BulkEventCategoryModal";
import Can from "@/components/access/Can";
import UpcomingEventsAccordion from "./UpcomingEventsAccordion";
import DayView from "./DayView";
import {
  emptyEventForm,
  mergeCategoryOptions,
  type EventCategory,
  type EventForm,
  type EventItem,
} from "./eventForm";
import { expandRecurrence, isoDate } from "./recurrence";
import { coversDate } from "./eventDates";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EventsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const tenantType = useTenantType();
  const { data, loading, refetch } = useQuery(LIST_EVENTS);
  const events: EventItem[] = data?.events ?? [];

  const { data: catData, refetch: refetchCategories } = useQuery(LIST_EVENT_CATEGORIES);
  const orgCategories: EventCategory[] = catData?.eventCategories ?? [];
  const categoryOptions = mergeCategoryOptions(tenantType, orgCategories);

  const [createEvent] = useMutation(CREATE_EVENT, { onCompleted: () => refetch() });
  const [updateEvent] = useMutation(UPDATE_EVENT, { onCompleted: () => refetch() });
  const [deleteEvent] = useMutation(DELETE_EVENT, { onCompleted: () => refetch() });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(isoDate(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showCategoryBulk, setShowCategoryBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyEventForm());

  // Merge a partial update into the form (passed down to the modal).
  const patchForm = (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { repeatFreq, repeatCount, ...baseInput } = form;

      if (editingId) {
        // Editing never creates recurrences — just updates the one row.
        await updateEvent({ variables: { id: editingId, input: baseInput } });
        toast.success("Event updated");
      } else {
        // Fan out the (eventDate, endDate) pairs to create.
        const occurrences = expandRecurrence(
          baseInput.eventDate,
          baseInput.endDate,
          repeatFreq,
          Math.max(1, repeatCount),
        );
        for (const occ of occurrences) {
          await createEvent({
            variables: {
              input: { ...baseInput, eventDate: occ.start, endDate: occ.end },
            },
          });
        }
        toast.success(
          occurrences.length > 1
            ? `Created ${occurrences.length} events`
            : "Event created",
        );
      }
      setForm(emptyEventForm());
      setEditingId(null);
      setShowModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Open a blank create modal (header button).
  const openCreate = () => {
    setForm(emptyEventForm());
    setEditingId(null);
    setShowModal(true);
  };

  // Open the modal pre-filled for a specific date (double-click on a grid cell).
  const openCreateForDate = (day: number) => {
    if (!isAdmin) return;
    const dateStr = cellDate(day);
    setSelectedDate(dateStr);
    setForm(emptyEventForm(dateStr));
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (event: EventItem) => {
    setForm({
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      endDate: event.endDate,
      location: event.location,
      category: event.category,
      color: event.color,
      isPublic: event.isPublic,
      repeatFreq: "none",
      repeatCount: 1,
    });
    setEditingId(event.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete event?")) return;
    try {
      await deleteEvent({ variables: { id } });
      toast.success("Event deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // "YYYY-MM-DD" for a day number in the month currently being viewed.
  const cellDate = (day: number) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // An event covers a cell when the cell's date falls within [eventDate, endDate].
  const getEventsForDate = (day: number) =>
    events.filter((e) => coversDate(e, cellDate(day)));

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthYear = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div>
      <Header
        title="Events & Calendar"
        subtitle="Manage organisation events and calendar"
        action={
          isAdmin && (
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => setShowCategories(true)}
              >
                <Tag size={16} /> Categories
              </button>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => setShowBulk(true)}
              >
                <Upload size={16} /> Bulk Add
              </button>
              <Can module="events" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                  <Plus size={16} /> New Event
                </button>
              </Can>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="p-2 hover:bg-muted rounded-lg transition"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <select
                  value={currentDate.getMonth()}
                  onChange={(e) =>
                    setCurrentDate(
                      new Date(currentDate.getFullYear(), parseInt(e.target.value, 10), 1),
                    )
                  }
                  className="input-field py-1 px-2 text-sm font-semibold min-w-[130px]"
                >
                  {MONTHS_FULL.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={currentDate.getFullYear()}
                  onChange={(e) =>
                    setCurrentDate(
                      new Date(parseInt(e.target.value, 10), currentDate.getMonth(), 1),
                    )
                  }
                  className="input-field py-1 px-2 text-sm font-semibold w-[90px]"
                >
                  {Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 5 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="p-2 hover:bg-muted rounded-lg transition"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Double-click a date to add an event" : monthYear}
              </p>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map((i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isSelected = cellDate(day) === selectedDate;
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(cellDate(day))}
                    onDoubleClick={() => openCreateForDate(day)}
                    title={isAdmin ? "Double-click to add an event" : "Click to view this day"}
                    className={`aspect-square rounded-lg p-2 text-sm transition cursor-pointer relative select-none ${
                      isSelected
                        ? "ring-2 ring-primary bg-primary/5"
                        : "border border-border/40 hover:bg-muted/50"
                    }`}
                  >
                    <span className={`font-semibold text-xs mb-1 ${isSelected ? "text-primary" : ""}`}>{day}</span>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: e.color }}
                          title={e.title}
                        />
                      ))}
                      {dayEvents.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: accordions capped to the calendar's height. The inner
            wrapper is absolutely positioned at lg so its content never stretches
            the grid row taller than the calendar; each body scrolls instead. */}
        <div className="lg:relative">
          <div className="flex flex-col gap-6 lg:absolute lg:inset-0 lg:overflow-hidden">
            <UpcomingEventsAccordion
              events={events}
              loading={loading}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <DayView
              date={selectedDate}
              events={events}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      <EventModal
        open={showModal}
        editingId={editingId}
        form={form}
        categories={categoryOptions}
        onChange={patchForm}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        saving={saving}
      />

      <BulkEventModal
        open={showBulk}
        categories={categoryOptions}
        onClose={() => setShowBulk(false)}
        onFinished={() => refetch()}
      />

      <CategoryManagerModal
        open={showCategories}
        categories={orgCategories}
        onClose={() => setShowCategories(false)}
        onChanged={() => refetchCategories()}
        onOpenBulk={() => { setShowCategories(false); setShowCategoryBulk(true); }}
      />

      <BulkEventCategoryModal
        open={showCategoryBulk}
        onClose={() => setShowCategoryBulk(false)}
        onFinished={() => refetchCategories()}
      />
    </div>
  );
}
