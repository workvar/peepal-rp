"use client";

import { useState, useMemo } from "react";
import { Upload, Search, Trash2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useCurriculum } from "./useCurriculum";
import CourseAccordion from "./CourseAccordion";
import BulkCurriculumModal from "./BulkCurriculumModal";

export default function CurriculumPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canEdit = user?.role === "admin" || user?.role === "super_admin";

  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { courses, coursesLoading, clearCourses, clearing } = useCurriculum();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      [c.name, c.code, c.department?.name ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [courses, search]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    const confirm = window.confirm(
      `Clear all curriculum for ${selected.size} course(s)? This removes all subject assignments.`,
    );
    if (!confirm) return;
    await clearCourses([...selected]);
    setSelected(new Set());
  };

  return (
    <div>
      <Header
        title="Curriculum"
        subtitle="Assign subjects to each semester of a programme. Each subject's course plan and outcomes follow it automatically."
        action={
          canEdit ? (
            <Button variant="outline" onClick={() => setShowBulk(true)}>
              <Upload size={16} /> Bulk Upload
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-field pl-9"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {canEdit && selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={clearing}
          >
            <Trash2 size={14} />
            {clearing ? "Clearing…" : `Clear Curriculum (${selected.size})`}
          </Button>
        )}
      </div>

      {coursesLoading && <LoadingSpinner />}

      {!coursesLoading && filtered.length === 0 && (
        <div className="card text-center py-12 text-muted-foreground/70">
          {search ? "No courses match your search." : "No courses found."}
        </div>
      )}

      {!coursesLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {canEdit && (
            <div className="flex items-center gap-2 pb-1 px-1">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
          )}

          {filtered.map((course) => (
            <CourseAccordion
              key={course.id}
              course={course}
              canEdit={canEdit}
              selected={selected.has(course.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {showBulk && (
        <BulkCurriculumModal
          open
          onClose={() => setShowBulk(false)}
          onFinished={() => {}}
        />
      )}
    </div>
  );
}
