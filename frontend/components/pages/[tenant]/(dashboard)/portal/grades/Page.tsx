"use client";

import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Download, GraduationCap } from "lucide-react";
import { useMyResult } from "./useMyResult";
import SummaryCard from "./SummaryCard";
import SemesterCard from "./SemesterCard";
import { gradeAPI } from "@/api/services/grades";
import { downloadBlobResponse } from "@/functions/downloadBlob";

export default function MyGradesPage() {
  const { result, loading, error } = useMyResult();

  const onDownload = async () => {
    if (!result) return;
    try {
      const res = await gradeAPI.downloadReportPDF();
      downloadBlobResponse(res.data, `grade-report-${result.rollNumber || "me"}.pdf`);
    } catch {
      toast.error("Could not generate the grade report");
    }
  };

  if (loading && !result) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-red-500">
        Could not load your grades. Please contact your administrator.
      </div>
    );
  }

  const hasResults = !!result && result.semesters.length > 0;

  return (
    <div>
      <Header
        title="My Grades"
        subtitle="Your semester-wise results and transcript"
        action={
          hasResults && (
            <button className="btn-primary flex items-center gap-2" onClick={onDownload}>
              <Download size={16} /> Download PDF
            </button>
          )
        }
      />

      {!result || result.semesters.length === 0 ? (
        <div className="card p-10 text-center">
          <GraduationCap size={32} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No published results yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Your grades appear here once your college publishes them.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <SummaryCard result={result} />
          <div className="space-y-6">
            {result.semesters.map((sem) => (
              <SemesterCard key={sem.semester} sem={sem} mode={result.mode} gpaMax={result.gpaMax} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
