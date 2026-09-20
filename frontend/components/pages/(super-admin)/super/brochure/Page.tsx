"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import toast from "react-hot-toast";
import { ExternalLink, Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { BROCHURE_CONTENT } from "@/graphql/queries/brochure";
import { UPDATE_BROCHURE_CONTENT } from "@/graphql/mutations/brochure";
import {
  DEFAULT_CONTENT,
  mergeContent,
  type BrochureContent,
} from "@/lib/brochure/content";
import { TextField, AreaField } from "./Field";
import ModulesEditor from "./ModulesEditor";
import PillarsEditor from "./PillarsEditor";

type Section = keyof BrochureContent;

export default function BrochureEditorPage() {
  const { data, loading } = useQuery(BROCHURE_CONTENT, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [save, { loading: saving }] = useMutation(UPDATE_BROCHURE_CONTENT);

  const [content, setContent] = useState<BrochureContent>(DEFAULT_CONTENT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || data === undefined) return;
    const raw = data?.brochureContent;
    if (raw) {
      try {
        setContent(mergeContent(JSON.parse(raw)));
      } catch {
        setContent(DEFAULT_CONTENT);
      }
    }
    setHydrated(true);
  }, [data, hydrated]);

  // Patch one section of the content object.
  function patch<S extends Section>(section: S, value: Partial<BrochureContent[S]>) {
    setContent((c) => ({ ...c, [section]: { ...c[section], ...value } }));
  }

  async function onSave() {
    try {
      await save({ variables: { content: JSON.stringify(content) } });
      toast.success("Brochure saved");
    } catch {
      toast.error("Failed to save brochure");
    }
  }

  if (loading && !hydrated) {
    return <LoadingSpinner text="Loading brochure…" />;
  }

  const { cover, why, features, closing } = content;

  return (
    <div className="pb-24">
      <PageHeader
        title="Brochure"
        subtitle="Edit the public brochure. Changes appear on the page and in the downloadable PDF."
        actions={
          <>
            <a href="/brochure" target="_blank" rel="noreferrer" className="btn-outline inline-flex items-center gap-2">
              <ExternalLink size={15} /> Open page
            </a>
            <button onClick={onSave} disabled={saving} className="btn-primary inline-flex items-center gap-2">
              <Save size={15} /> {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      />

      <div className="max-w-3xl space-y-6">
        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Cover</h2>
          <TextField label="Label" value={cover.label} onChange={(v) => patch("cover", { label: v })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Title line 1" value={cover.title1} onChange={(v) => patch("cover", { title1: v })} />
            <TextField label="Title line 2" value={cover.title2} onChange={(v) => patch("cover", { title2: v })} />
          </div>
          <TextField label="Lead" value={cover.lead} onChange={(v) => patch("cover", { lead: v })} />
          <AreaField label="Paragraph" value={cover.paragraph} onChange={(v) => patch("cover", { paragraph: v })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Edition" value={cover.edition} onChange={(v) => patch("cover", { edition: v })} />
            <TextField label="Brand" value={cover.brand} onChange={(v) => patch("cover", { brand: v })} />
            <TextField label="Built-for line" value={cover.builtForLine} onChange={(v) => patch("cover", { builtForLine: v })} />
            <TextField label="CTA text" value={cover.ctaText} onChange={(v) => patch("cover", { ctaText: v })} />
            <TextField label="Contact email" value={cover.contactEmail} onChange={(v) => patch("cover", { contactEmail: v })} />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Why choose</h2>
          <TextField label="Title" value={why.title} onChange={(v) => patch("why", { title: v })} />
          <AreaField label="Subhead" value={why.subhead} rows={2} onChange={(v) => patch("why", { subhead: v })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Pillars</label>
            <PillarsEditor pillars={why.pillars} onChange={(p) => patch("why", { pillars: p })} />
          </div>
          <TextField label="Why title" value={why.whyTitle} onChange={(v) => patch("why", { whyTitle: v })} />
          <AreaField label="Why paragraph" value={why.whyParagraph} onChange={(v) => patch("why", { whyParagraph: v })} />
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Feature page</h2>
          <TextField label="Title" value={features.title} onChange={(v) => patch("features", { title: v })} />
          <AreaField label="Subhead" value={features.subhead} rows={2} onChange={(v) => patch("features", { subhead: v })} />
          <TextField label="Footer" value={features.footer} onChange={(v) => patch("features", { footer: v })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Modules</label>
            <ModulesEditor modules={content.modules} onChange={(m) => setContent((c) => ({ ...c, modules: m }))} />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Closing</h2>
          <TextField label="Title" value={closing.title} onChange={(v) => patch("closing", { title: v })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Brand" value={closing.brand} onChange={(v) => patch("closing", { brand: v })} />
            <TextField label="CTA text" value={closing.ctaText} onChange={(v) => patch("closing", { ctaText: v })} />
            <TextField label="Contact email" value={closing.contactEmail} onChange={(v) => patch("closing", { contactEmail: v })} />
          </div>
        </section>
      </div>
    </div>
  );
}
