"use client";

import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  PlayCircle,
  FileCheck2,
  GripVertical,
  Video,
} from "lucide-react";
import type { BuilderPageState } from "./useBuilderPage";

// Renders the ordered list of sections and their items (units/assignments).
export default function SectionList({ page }: { page: BuilderPageState }) {
  const {
    sections,
    openCreateUnit,
    openCreateAssignment,
    openEditSection,
    handleDeleteSection,
    openEditUnit,
    openEditAssignment,
    handleDeleteUnit,
    handleDeleteAssignment,
  } = page;

  return (
    <div className="space-y-4">
      {sections.map((s) => {
        const items = [...(s.items ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
        return (
          <div key={s.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="text-muted-foreground/60" />
                <div>
                  <div className="text-sm text-muted-foreground/70">
                    Section {s.orderIndex + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary btn-sm flex items-center gap-1 text-sm"
                  onClick={() => openCreateUnit(s.id)}
                >
                  <Plus size={14} /> Unit
                </button>
                <button
                  className="btn-secondary btn-sm flex items-center gap-1 text-sm"
                  onClick={() => openCreateAssignment(s.id)}
                >
                  <Plus size={14} /> Assignment
                </button>
                <button
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => openEditSection(s)}
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteSection(s)}
                  title="Delete section"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground/70 italic pl-6">
                No items yet. Add a unit or assignment.
              </div>
            ) : (
              <ul className="space-y-2 pl-2">
                {items.map((it, idx) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground/70 w-6 text-right">
                        {idx + 1}.
                      </span>
                      {it.itemType === "unit" ? (
                        <PlayCircle size={18} className="text-primary shrink-0" />
                      ) : (
                        <FileCheck2 size={18} className="text-amber-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-0.5">
                          <Badge
                            label={it.itemType === "unit" ? "Unit" : "Assignment"}
                            variant={it.itemType === "unit" ? "blue" : "warning"}
                          />
                          {it.itemType === "unit" && it.videoType && it.videoType !== "none" && (
                            <span className="inline-flex items-center gap-1">
                              <Video size={12} />
                              {it.videoType === "upload" ? "Uploaded" : "External"}
                            </span>
                          )}
                          {it.itemType === "assignment" && (
                            <span>
                              {it.assessmentType === "score"
                                ? `Score ≥ ${it.passScore ?? 0}`
                                : "Completion"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() =>
                          it.itemType === "unit"
                            ? openEditUnit(s.id, it)
                            : openEditAssignment(s.id, it)
                        }
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() =>
                          it.itemType === "unit"
                            ? handleDeleteUnit(it)
                            : handleDeleteAssignment(it)
                        }
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {sections.length === 0 && (
        <div className="card p-8 text-center text-muted-foreground/70">
          No sections yet. Click "Add Section" to get started.
        </div>
      )}
    </div>
  );
}
