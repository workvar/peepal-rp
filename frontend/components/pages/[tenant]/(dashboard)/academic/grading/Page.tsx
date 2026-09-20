"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { GPA_MODES } from "@/types/grading";
import { useGrading } from "./useGrading";
import SchemeSettings from "./SchemeSettings";
import BandEditor from "./BandEditor";
import GradePreview from "./GradePreview";
import { schemeToForm, formToInput, DEFAULT_FORM, type SchemeForm } from "./types";

export default function GradingPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const readOnly = role !== "admin" && role !== "super_admin";

  const { scheme, loading, saveMut, saving } = useGrading();
  const [form, setForm] = useState<SchemeForm>(DEFAULT_FORM);

  useEffect(() => {
    if (scheme) setForm(schemeToForm(scheme));
  }, [scheme]);

  const patch = (p: Partial<SchemeForm>) => setForm((f) => ({ ...f, ...p }));
  const isGpa = GPA_MODES.includes(form.mode);

  const handleSave = async () => {
    const input = formToInput(form);
    if (input.bands.length === 0) {
      toast.error("Add at least one grade band");
      return;
    }
    try {
      await saveMut({ variables: { input } });
      toast.success("Grading scheme saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save scheme");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Grading"
        subtitle="Define how marks become semester and cumulative results"
        action={
          !readOnly && (
            <Can module="grading" action="edit">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} /> {saving ? "Saving…" : "Save scheme"}
              </button>
            </Can>
          )
        }
      />

      <div className="space-y-6 max-w-4xl">
        <SchemeSettings form={form} onChange={patch} disabled={readOnly} />
        <BandEditor
          bands={form.bands}
          showGradePoint={isGpa}
          onChange={(bands) => patch({ bands })}
          disabled={readOnly}
        />
        <GradePreview form={form} />
      </div>
    </div>
  );
}
