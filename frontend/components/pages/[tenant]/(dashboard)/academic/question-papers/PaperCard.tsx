"use client";

// One generated paper: header row with actions, expandable to the preview.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { ChevronDown, ChevronUp, Download, Lock, Trash2 } from "lucide-react";
import PaperPreview from "./PaperPreview";
import type { GqlQuestionPaper } from "./types";

export default function PaperCard({
  paper,
  onDownload,
  onFinalize,
  onDelete,
}: {
  paper: GqlQuestionPaper;
  onDownload: (p: GqlQuestionPaper) => void;
  onFinalize: (p: GqlQuestionPaper) => void;
  onDelete: (p: GqlQuestionPaper) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDraft = paper.status !== "finalized";

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{paper.title}</h3>
            <Badge
              label={isDraft ? "Draft" : "Finalized"}
              variant={isDraft ? "yellow" : "green"}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {paper.items.length} questions · {paper.totalMarks} marks
            {paper.durationMinutes ? ` · ${paper.durationMinutes} min` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {open ? "Hide" : "Preview"}
          </button>
          <button
            onClick={() => onDownload(paper)}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Download size={15} /> PDF
          </button>
          {isDraft && (
            <Can module="question-papers" action="edit">
              <button
                onClick={() => onFinalize(paper)}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <Lock size={15} /> Finalize
              </button>
            </Can>
          )}
          {isDraft && (
            <Can module="question-papers" action="delete">
              <button
                onClick={() => onDelete(paper)}
                className="p-1 text-red-500 hover:text-red-700"
                aria-label={`Delete ${paper.title}`}
              >
                <Trash2 size={15} />
              </button>
            </Can>
          )}
        </div>
      </div>

      {isDraft && (
        <p className="mt-2 text-xs text-muted-foreground/70">
          Drafts download with a DRAFT watermark. Finalizing locks the paper and removes it.
        </p>
      )}

      {open && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <PaperPreview paper={paper} />
        </div>
      )}
    </div>
  );
}
