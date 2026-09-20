"use client";

// OPD slip configurator (admin only). Edits the tenant's slip design on the
// left with a live preview on the right; the same renderer produces the sheet
// the patient carries to the doctor.

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { GET_ORG_PROFILE } from "@/graphql/queries/org";
import { useOpdSlipConfig } from "@/components/opd-slip/useOpdSlipConfig";
import { DEFAULT_SLIP_CONFIG } from "@/components/opd-slip/defaults";
import type { OpdSlipConfig } from "@/components/opd-slip/types";
import toast from "react-hot-toast";
import BrandingSection from "./BrandingSection";
import FieldsSection from "./FieldsSection";
import LayoutSection from "./LayoutSection";
import PreviewPane from "./PreviewPane";
import { sampleSlipData } from "./sampleData";

export default function OpdSlipSettingsPage() {
  const { config: saved, loading, saving, save } = useOpdSlipConfig();
  const { data: orgData } = useQuery(GET_ORG_PROFILE);

  const [draft, setDraft] = useState<OpdSlipConfig>(saved);
  const [ready, setReady] = useState(false);

  // Seed the editor once the saved design arrives; later edits stay local
  // until the admin saves.
  useEffect(() => {
    if (!loading && !ready) {
      setDraft(saved);
      setReady(true);
    }
  }, [loading, ready, saved]);

  const set = (patch: Partial<OpdSlipConfig>) => setDraft((d) => ({ ...d, ...patch }));

  const handleSave = async () => {
    try {
      await save(draft);
      toast.success("OPD slip design saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_SLIP_CONFIG);
    toast("Reset to defaults — save to apply");
  };

  const sample = sampleSlipData(
    orgData?.orgProfile?.name ?? "Your Hospital",
    orgData?.orgProfile?.logoUrl ?? "",
  );

  if (loading && !ready) return <LoadingSpinner />;

  return (
    <div>
      <Header
        title="OPD Slip Designer"
        subtitle="Customise the slip printed at booking and carried to the doctor"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleReset}>Reset</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save design"}
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <BrandingSection config={draft} set={set} />
          <FieldsSection config={draft} set={set} />
          <LayoutSection config={draft} set={set} />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <PreviewPane config={draft} data={sample} />
        </div>
      </div>
    </div>
  );
}
