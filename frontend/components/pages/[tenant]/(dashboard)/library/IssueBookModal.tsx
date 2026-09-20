"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
import SearchSelect from "@/components/ui/SearchSelect";
import type { PersonOption } from "@/components/ui/PeopleMultiSelect";
import type { GqlStudent } from "@/types/pages/students/page";
import type { GqlEmployee } from "@/types/pages/employees/page";
import { X } from "lucide-react";

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

type BorrowerType = "student" | "staff";

interface Props {
  open: boolean;
  onClose: () => void;
  // Returns true on success so the modal can close + reset.
  onSubmit: (input: { bookId: string; userId: string; dueDate: string }) => Promise<boolean>;
}

// Issue a book to a student or staff member. The book is picked from a
// searchable dropdown (by title or ISBN) and the borrower from a searchable
// student/staff picker; both resolve to the ids the issue mutation needs
// (book id and the borrower's login user id).
export default function IssueBookModal({ open, onClose, onSubmit }: Props) {
  const books = useAppSelector((s) => s.library.books);
  const [borrowerType, setBorrowerType] = useState<BorrowerType>("student");
  const [bookId, setBookId] = useState("");
  const [userId, setUserId] = useState("");
  const [dueDate, setDueDate] = useState(addDays(14));
  const [submitting, setSubmitting] = useState(false);

  // Load people only while the modal is open.
  const { data: studentData, loading: studentsLoading } = useQuery(LIST_STUDENTS, {
    skip: !open,
    fetchPolicy: "cache-and-network",
  });
  const { data: staffData, loading: staffLoading } = useQuery(LIST_EMPLOYEES, {
    skip: !open,
    fetchPolicy: "cache-and-network",
  });

  const bookOptions: PersonOption[] = useMemo(
    () =>
      books.map((b) => ({
        id: b.id,
        name: b.title,
        sub: [b.isbn, b.author].filter(Boolean).join(" · "),
      })),
    [books]
  );

  const studentOptions: PersonOption[] = useMemo(
    () =>
      ((studentData?.students ?? []) as GqlStudent[])
        .filter((s) => s.user?.id)
        .map((s) => ({ id: s.user!.id, name: s.user?.name ?? "Unknown", sub: s.rollNumber })),
    [studentData]
  );

  const staffOptions: PersonOption[] = useMemo(
    () =>
      ((staffData?.employees ?? []) as GqlEmployee[])
        .filter((e) => e.user?.id)
        .map((e) => ({ id: e.user.id, name: e.user?.name ?? "Unknown", sub: e.employeeId || e.designation || "" })),
    [staffData]
  );

  if (!open) return null;

  const reset = () => {
    setBookId("");
    setUserId("");
    setDueDate(addDays(14));
    setBorrowerType("student");
  };
  const close = () => { reset(); onClose(); };

  // Clear the picked borrower when switching groups so an id from the other
  // group can't carry over.
  const switchBorrower = (t: BorrowerType) => {
    setBorrowerType(t);
    setUserId("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId || !userId || !dueDate) return;
    setSubmitting(true);
    const ok = await onSubmit({ bookId, userId, dueDate });
    setSubmitting(false);
    if (ok) close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Issue Book</h3>
          <button onClick={close} className="p-1 hover:bg-muted rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Book */}
          <div>
            <label className="block text-sm font-medium mb-1">Book</label>
            <SearchSelect
              value={bookId}
              onChange={setBookId}
              options={bookOptions}
              placeholder="Search by title or ISBN…"
            />
          </div>

          {/* Borrower: student / staff tabs */}
          <div>
            <label className="block text-sm font-medium mb-1">Borrower</label>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 mb-2 w-fit">
              {(["student", "staff"] as BorrowerType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchBorrower(t)}
                  className={`px-3 py-1 text-xs rounded-md capitalize transition ${
                    borrowerType === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {borrowerType === "student" ? (
              <SearchSelect
                value={userId}
                onChange={setUserId}
                options={studentOptions}
                loading={studentsLoading}
                placeholder="Search students by name or roll number…"
              />
            ) : (
              <SearchSelect
                value={userId}
                onChange={setUserId}
                options={staffOptions}
                loading={staffLoading}
                placeholder="Search staff by name or employee ID…"
              />
            )}
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map((w) => {
                const preset = addDays(w * 7);
                const active = dueDate === preset;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setDueDate(preset)}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {w} week{w > 1 ? "s" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!bookId || !userId || submitting}
            className="w-full btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Issuing…" : "Issue Book"}
          </button>
        </form>
      </div>
    </div>
  );
}
