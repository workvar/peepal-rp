"use client";

// On-screen preview of a generated paper, grouped into the same sections the
// PDF prints. Lets a teacher sanity-check a draft before finalizing it.

import { Badge } from "@/components/ui/badge";
import type { GqlPaperItem, GqlQuestionPaper } from "./types";
import { SECTION_LABELS } from "./types";

/** Group items by section, preserving the generator's ordering. */
function groupBySection(items: GqlPaperItem[]): [string, GqlPaperItem[]][] {
  const groups: [string, GqlPaperItem[]][] = [];
  items.forEach((item) => {
    const section = item.section ?? "";
    const last = groups[groups.length - 1];
    if (last && last[0] === section) last[1].push(item);
    else groups.push([section, [item]]);
  });
  return groups;
}

export default function PaperPreview({ paper }: { paper: GqlQuestionPaper }) {
  if (paper.items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground/70">
        This paper has no questions.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupBySection(paper.items).map(([section, items]) => (
        <div key={section || "none"}>
          <h4 className="mb-2 text-sm font-semibold text-foreground/80">
            {SECTION_LABELS[section] ?? (section ? `Section ${section}` : "Questions")}
          </h4>
          <ol className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-foreground/90">
                    <span className="font-medium">Q{item.seqNo}.</span> {item.questionText}
                  </span>
                  <Badge label={`${item.marks}`} variant="gray" className="shrink-0" />
                </div>
                {item.options.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-6 text-xs text-muted-foreground">
                    {item.options.map((opt, i) => (
                      <li key={opt}>
                        {String.fromCharCode(97 + (i % 26))}) {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
