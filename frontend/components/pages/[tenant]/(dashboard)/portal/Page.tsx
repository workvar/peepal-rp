"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { studentsAPI } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { User, CalendarCheck, BookOpen, GraduationCap, CalendarDays, CreditCard } from "lucide-react";
import type { StudentPortalData } from "@/types";
import { useMyTimetable } from "@/components/pages/[tenant]/(dashboard)/timetable/useMyTimetable";
import StudentTimetableView from "@/components/pages/[tenant]/(dashboard)/timetable/StudentTimetableView";

const gradeVariant: Record<string, "green" | "blue" | "yellow" | "red" | "gray"> = {
  O: "green", "A+": "green", A: "blue", "B+": "blue", B: "yellow", C: "yellow", F: "red", "N/A": "gray",
};

export default function StudentPortalPage() {
  const user = useAppSelector((s) => s.auth.user);
  const params = useParams();
  const tenant = params.tenant as string;
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { slots: timetableSlots, loading: timetableLoading } = useMyTimetable();

  useEffect(() => {
    (async () => {
      try {
        const res = await studentsAPI.myProfile();
        setData(res.data.data as StudentPortalData);
      } catch {
        setError("Could not load your profile. Please contact your administrator.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!data) return null;

  const { student, attendance_pct, attendance_present, attendance_total, recent_marks } = data;
  const attPct = Math.round(attendance_pct);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
          {student.photo_url ? (
            <Image src={student.photo_url} alt="" width={64} height={64} unoptimized className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <GraduationCap size={28} className="text-indigo-500" />
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{student.user?.name}</h1>
          <p className="text-muted-foreground text-sm">{student.roll_number} · {student.course?.name}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            student.admission_status === "active" ? "bg-green-100 text-green-700" : "bg-muted/60 text-muted-foreground"
          }`}>
            {student.admission_status ?? "active"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <CalendarCheck size={20} className="mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{attPct}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Attendance</p>
          <p className="text-xs text-muted-foreground/70">{attendance_present}/{attendance_total} days</p>
        </div>
        <div className="card text-center">
          <BookOpen size={20} className="mx-auto text-indigo-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{recent_marks.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assessments</p>
        </div>
        <div className="card text-center">
          <User size={20} className="mx-auto text-purple-500 mb-2" />
          <p className="text-lg font-bold text-foreground">Sem {student.semester}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Current Semester</p>
        </div>
        <div className="card text-center">
          <GraduationCap size={20} className="mx-auto text-green-500 mb-2" />
          <p className="text-lg font-bold text-foreground">{student.batch || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Batch</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/${tenant}/portal/grades`}
          className="card flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <GraduationCap size={20} className="text-indigo-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">My Grades</p>
              <p className="text-xs text-muted-foreground">Semester results, GPA, and PDF transcript</p>
            </div>
          </div>
          <span className="text-sm font-medium text-blue-600">View →</span>
        </Link>

        <Link
          href={`/${tenant}/portal/fees`}
          className="card flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <CreditCard size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">My Fees</p>
              <p className="text-xs text-muted-foreground">Schedule, dues, and downloadable receipts</p>
            </div>
          </div>
          <span className="text-sm font-medium text-blue-600">View →</span>
        </Link>
      </div>

      {/* My Timetable */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={18} className="text-indigo-500" />
          <h2 className="font-semibold text-foreground">My Timetable</h2>
        </div>
        <StudentTimetableView slots={timetableSlots} loading={timetableLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details */}
        <div className="card">
          <h2 className="font-semibold text-foreground mb-4">Personal Details</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Email", student.user?.email],
              ["Phone", student.phone],
              ["Date of Birth", student.date_of_birth],
              ["Gender", student.gender],
              ["Blood Group", student.blood_group],
              ["Nationality", student.nationality || "—"],
              ["Address", [student.address, student.city, student.state, student.pincode].filter(Boolean).join(", ") || "—"],
            ].map(([label, value]) => (
              value ? (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-foreground font-medium text-right max-w-xs">{value}</dd>
                </div>
              ) : null
            ))}
          </dl>
        </div>

        {/* Recent Marks */}
        <div className="card">
          <h2 className="font-semibold text-foreground mb-4">Recent Assessments</h2>
          {recent_marks.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm text-center py-4">No marks recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recent_marks.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.subject}</p>
                    <p className="text-xs text-muted-foreground/70 capitalize">{(m.assessment_type || m.exam_type || "").replace(/_/g, " ")} · Sem {m.semester}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-sm font-mono text-foreground/80">{m.marks_obtained}/{m.max_marks}</span>
                    <Badge label={m.grade || "N/A"} variant={gradeVariant[m.grade ?? "N/A"] ?? "gray"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Parent/Guardian Info */}
      {(student.father_name || student.mother_name) && (
        <div className="card">
          <h2 className="font-semibold text-foreground mb-4">Parent / Guardian Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {student.father_name && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Father</p>
                <p className="font-medium text-foreground">{student.father_name}</p>
                {student.father_phone && <p className="text-muted-foreground">{student.father_phone}</p>}
              </div>
            )}
            {student.mother_name && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Mother</p>
                <p className="font-medium text-foreground">{student.mother_name}</p>
                {student.mother_phone && <p className="text-muted-foreground">{student.mother_phone}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
