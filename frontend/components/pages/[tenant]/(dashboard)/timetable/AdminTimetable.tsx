"use client";

/**
 * Admin / teacher / staff timetable view.
 *
 * Lets privileged roles:
 *   - Filter by course, semester, section
 *   - Add / edit / delete individual slots
 *   - Bulk upload a weekly schedule
 *
 * Students never reach this view; they get StudentTimetable instead.
 */

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus, BookOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimetablePage } from "./useTimetablePage";
import TimetableGrid from "./TimetableGrid";
import SlotDialog from "./SlotDialog";
import BulkTimetableModal from "./BulkTimetableModal";
import Can from "@/components/access/Can";

export default function AdminTimetable() {
  const page = useTimetablePage();
  const {
    canEdit,
    courseId, setCourseId, semester, setSemester, section, setSection,
    courses, slots, slotsByDay, refetch,
    confirmState, setConfirmState, openCreate,
  } = page;
  const [showBulk, setShowBulk] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        subtitle="Weekly class schedule"
        actions={
          canEdit ? (
            <Can module="timetable" action="create">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowBulk(true)}>
                  <Upload size={16} /> Bulk Upload
                </Button>
                {courseId && (
                  <button onClick={() => openCreate()} className="btn-primary">
                    <Plus size={16} /> Add Slot
                  </button>
                )}
              </div>
            </Can>
          ) : undefined
        }
      />

      {/* ── Filter bar ── */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        {/* Course */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Course</label>
          <div className="relative">
            <select
              className="input-field pr-9"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Semester */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Semester</label>
          <select
            className="input-field"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {[1,2,3,4,5,6,7,8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Section</label>
          <select
            className="input-field"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {["A","B","C","D"].map((s) => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => courseId && refetch()}
          disabled={!courseId}
          className="btn-primary btn-sm self-end"
        >
          Load
        </button>
      </div>

      {/* ── Timetable grid ── */}
      <TimetableGrid page={page} />

      {/* Slot count summary */}
      {slots.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen size={13} />
          <span>{slots.length} total slots across {Object.values(slotsByDay).filter((d) => d.length > 0).length} days</span>
        </div>
      )}

      <SlotDialog page={page} />

      {showBulk && (
        <BulkTimetableModal
          open
          onClose={() => setShowBulk(false)}
          onFinished={() => { if (courseId) refetch(); }}
        />
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
