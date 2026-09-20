"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import { attendanceExportAPI } from "@/lib/api";
import { LIST_COURSES } from "@/graphql/queries/students";
import Header from "@/components/layout/Header";
import SearchableSelect from "@/components/ui/SearchableSelect";
import toast from "react-hot-toast";
import { Download } from "lucide-react";
import type { GqlCourse } from "@/types/pages/students/page";

export default function AttendanceExportPage() {
  const [form, setForm] = useState({
    from_date: "",
    to_date: "",
    course_id: "",
    batch: "",
    type: "student",
  });
  const [loading, setLoading] = useState(false);

  const { data: coursesData } = useQuery(LIST_COURSES);
  const courses: GqlCourse[] = coursesData?.courses ?? [];

  const courseOptions = useMemo(() => [
    { value: "", label: "All courses" },
    ...courses.map((c) => ({ value: c.id, label: c.name, sublabel: c.code })),
  ], [courses]);

  const batchOptions = useMemo(() => {
    const base = [{ value: "", label: "All batches" }];
    if (!form.course_id) return base;
    const course = courses.find((c) => c.id === form.course_id);
    if (!course?.batches?.length) return base;
    return [...base, ...course.batches.map((b) => ({ value: b.name, label: b.name }))];
  }, [form.course_id, courses]);

  function handleCourseChange(courseId: string) {
    setForm((f) => ({ ...f, course_id: courseId, batch: "" }));
  }

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from_date || !form.to_date) {
      toast.error("Please select date range");
      return;
    }
    setLoading(true);
    try {
      const response = await attendanceExportAPI.export({
        from_date: form.from_date,
        to_date: form.to_date,
        course_id: form.course_id || undefined,
        batch: form.batch || undefined,
        type: form.type,
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${form.type}-${form.from_date}-to-${form.to_date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Attendance exported successfully");
      setForm({ from_date: "", to_date: "", course_id: "", batch: "", type: "student" });
    } catch (error) {
      toast.error("Failed to export attendance");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Export Attendance"
        subtitle="Download attendance records in CSV format"
      />

      <div className="max-w-2xl">
        <div className="card p-8">
          <form onSubmit={handleExport} className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">From Date</label>
                <input
                  type="date"
                  required
                  value={form.from_date}
                  onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">To Date</label>
                <input
                  type="date"
                  required
                  value={form.to_date}
                  onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="student"
                    checked={form.type === "student"}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  />
                  <span className="text-sm">Students</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="employee"
                    checked={form.type === "employee"}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  />
                  <span className="text-sm">Employees</span>
                </label>
              </div>
            </div>

            {/* Course & Batch filters (students only) */}
            {form.type === "student" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Course (Optional)</label>
                  <SearchableSelect
                    options={courseOptions}
                    value={form.course_id}
                    onChange={handleCourseChange}
                    placeholder="All courses"
                    searchPlaceholder="Search courses..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Batch (Optional)</label>
                  <SearchableSelect
                    options={batchOptions}
                    value={form.batch}
                    onChange={(v) => setForm((f) => ({ ...f, batch: v }))}
                    placeholder={form.course_id ? "All batches" : "Select a course first"}
                    searchPlaceholder="Search batches..."
                    disabled={!form.course_id}
                  />
                </div>
              </>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                The exported CSV contains attendance records for the selected period. Format: Roll Number, Name, Date, Status
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              {loading ? "Exporting..." : "Export Attendance"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
