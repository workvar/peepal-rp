"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_PUBLISHED_RESULTS, GET_RESULT_SUMMARY } from "@/graphql/queries/marks";
import { PUBLISH_RESULTS } from "@/graphql/mutations/marks";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import toast from "react-hot-toast";
import { Plus, CheckCircle, Lock } from "lucide-react";

type GqlPublishedResult = {
  id: string;
  studentId: string;
  subject: string;
  examType: string;
  semester: number;
  marksObtained: number;
  maxMarks: number;
  grade?: string | null;
  isPublished: boolean;
  student?: {
    id: string;
    rollNumber: string;
    user?: { id: string; name: string } | null;
    course?: { id: string; name: string } | null;
  } | null;
};
type GqlResultSummary = { totalStudents: number; passCount: number; failCount: number };

export default function ResultsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [search, setSearch] = useState('');

  const [resultFilters, setResultFilters] = useState<{
    examType?: string;
    subject?: string;
    semester?: number;
    courseId?: string;
  }>({});

  const [summaryParams, setSummaryParams] = useState<{ courseId: string; semester: number } | null>(null);

  const [form, setForm] = useState({
    examType: "",
    subject: "",
    courseId: "",
    semester: "",
  });

  const { data: resultsData, loading } = useQuery(LIST_PUBLISHED_RESULTS, {
    variables: resultFilters,
  });
  const { data: summaryData } = useQuery(GET_RESULT_SUMMARY, {
    variables: summaryParams ?? { courseId: "", semester: 0 },
    skip: !summaryParams,
  });

  const [publishResultsMut, { loading: publishing }] = useMutation(PUBLISH_RESULTS, {
    refetchQueries: [{ query: LIST_PUBLISHED_RESULTS, variables: resultFilters }],
  });

  const publishedResults: GqlPublishedResult[] = resultsData?.publishedResults ?? [];
  const summary: GqlResultSummary | null = summaryData?.resultSummary ?? null;

  const filteredResults = search
    ? publishedResults.filter(r => [r.subject, r.examType, r.student?.user?.name].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : publishedResults;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await publishResultsMut({
        variables: {
          input: {
            examType: form.examType || null,
            subject: form.subject || null,
            semester: null,
            courseId: form.courseId || null,
          },
        },
      });
      // After publishing, update filters and summary params to reflect current form values
      const newFilters: typeof resultFilters = {};
      if (form.examType) newFilters.examType = form.examType;
      if (form.subject) newFilters.subject = form.subject;
      if (form.courseId) newFilters.courseId = form.courseId;
      setResultFilters(newFilters);
      if (form.courseId) setSummaryParams({ courseId: form.courseId, semester: Number(form.semester) });
      toast.success("Results published");
      setForm({ examType: "", subject: "", courseId: "", semester: "" });
      setShowPublishModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish results");
    }
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "O": return "bg-emerald-500";
      case "A+": return "bg-green-500";
      case "A": return "bg-lime-500";
      case "B+": return "bg-yellow-500";
      case "B": return "bg-amber-500";
      case "C": return "bg-orange-500";
      case "F": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div>
      <Header
        title="Result Publishing"
        subtitle={isAdmin ? "Publish exam results" : "View published results"}
        action={
          isAdmin && (
            <Can module="results" action="create">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => setShowPublishModal(true)}
              >
                <Plus size={16} /> Publish Results
              </button>
            </Can>
          )
        }
      />

      {isAdmin ? (
        <>
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Total Students</p>
                <p className="text-2xl font-bold">{summary.totalStudents || 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Passed</p>
                <p className="text-2xl font-bold text-green-500">{summary.passCount || 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Failed</p>
                <p className="text-2xl font-bold text-orange-500">{summary.failCount || 0}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <input
              className="input-field w-full"
              placeholder="Search subject, exam type, student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Results List */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="table-th">Student</th>
                    <th className="table-th">Subject</th>
                    <th className="table-th">Exam Type</th>
                    <th className="table-th">Course</th>
                    <th className="table-th">Marks</th>
                    <th className="table-th">Grade</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredResults.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="table-td">{r.student?.user?.name ?? "—"}</td>
                      <td className="table-td">{r.subject}</td>
                      <td className="table-td capitalize">{r.examType.replace(/_/g, " ")}</td>
                      <td className="table-td">{r.student?.course?.name ?? "—"}</td>
                      <td className="table-td font-mono">{r.marksObtained}/{r.maxMarks}</td>
                      <td className="table-td">
                        <span className={`${gradeColor(r.grade ?? "")} text-white text-xs px-2 py-0.5 rounded font-bold`}>
                          {r.grade ?? "N/A"}
                        </span>
                      </td>
                      <td className="table-td">
                        {r.isPublished ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <CheckCircle size={14} /> Published
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Lock size={14} /> Draft
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={7} className="table-td text-center text-muted-foreground/70 py-8">
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Student View */}
          <div className="mb-4">
            <input
              className="input-field max-w-sm"
              placeholder="Search subject, exam type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <LoadingSpinner />
            ) : filteredResults.length === 0 ? (
              <div className="col-span-full card p-8 text-center">
                <p className="text-muted-foreground">No published results yet</p>
              </div>
            ) : (
              filteredResults
                .filter((r) => r.isPublished)
                .map((result) => (
                  <div
                    key={result.id}
                    className="card p-6 border-l-4"
                    style={{
                      borderLeftColor: ["#10b981", "#84cc16", "#fbbf24", "#f97316", "#ef4444"][
                        ["O", "A+", "A", "B+", "B"].indexOf(result.grade ?? "")
                      ] || "#6b7280",
                    }}
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Subject</p>
                        <p className="font-semibold">{result.subject}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase mb-1">Score</p>
                          <p className="text-xl font-bold">
                            {result.marksObtained}/{result.maxMarks}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase mb-1">Grade</p>
                          <div
                            className={`${gradeColor(result.grade ?? "")} text-white text-center py-2 rounded-lg font-bold text-lg`}
                          >
                            {result.grade ?? "N/A"}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        Exam: {result.examType.replace(/_/g, " ")} · Sem {result.semester}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Publish Results</h3>

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Exam Type</label>
                <input
                  type="text"
                  value={form.examType}
                  onChange={(e) => setForm({ ...form, examType: e.target.value })}
                  placeholder="e.g. mid_sem, end_sem"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Subject name"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Course ID</label>
                <input
                  type="text"
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={publishing}
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={publishing}>
                  {publishing ? "Publishing…" : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
