"use client";

import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Plus, ArrowLeft } from "lucide-react";
import { useBuilderPage } from "./useBuilderPage";
import SectionList from "./SectionList";
import UnitModal from "./UnitModal";
import { SectionModal, AssignmentModal } from "./BuilderModals";

export default function CourseBuilderPage() {
  const page = useBuilderPage();
  const { router, tenant, isAdmin, goal, loading, openCreateSection } = page;

  if (!isAdmin) {
    return (
      <div>
        <Header title="Course Builder" subtitle="Admin only" />
        <div className="card p-8 text-center text-muted-foreground">
          You do not have access to this page.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={goal?.title ? `Builder — ${goal.title}` : "Course Builder"}
        subtitle={goal?.description || "Add sections, video units, and assignments."}
        action={
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => router.push(`/${tenant}/learning`)}
            >
              <ArrowLeft size={16} /> Back to Library
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={openCreateSection}>
              <Plus size={16} /> Add Section
            </button>
          </div>
        }
      />

      {loading && !goal ? (
        <LoadingSpinner />
      ) : !goal ? (
        <div className="card p-8 text-center text-muted-foreground">Goal not found.</div>
      ) : (
        <SectionList page={page} />
      )}

      <SectionModal page={page} />
      <UnitModal page={page} />
      <AssignmentModal page={page} />
    </div>
  );
}
