"use client";

import Modal from "@/components/ui/Modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Upload } from "lucide-react";
import { VideoType } from "@/types/pages/learning/page";
import type { BuilderPageState } from "./useBuilderPage";

// Create/edit modal for a learning unit, including the video source picker
// and the markdown reading-material editor with write/preview tabs.
export default function UnitModal({ page }: { page: BuilderPageState }) {
  const {
    showUnitModal, setShowUnitModal,
    editingUnitId, unitForm, setUnitForm,
    unitFile, setUnitFile, uploading,
    readingTab, setReadingTab, saveUnit,
  } = page;

  return (
    <Modal
      title={editingUnitId ? "Edit Unit" : "New Unit"}
      isOpen={showUnitModal}
      onClose={() => setShowUnitModal(false)}
    >
      <form onSubmit={saveUnit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Title</label>
          <input
            className="input-field"
            value={unitForm.title}
            onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
          <textarea
            className="input-field"
            rows={3}
            value={unitForm.description}
            onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Video type</label>
          <select
            className="input-field"
            value={unitForm.videoType}
            onChange={(e) =>
              setUnitForm({ ...unitForm, videoType: e.target.value as VideoType })
            }
          >
            <option value="none">None (reading only)</option>
            <option value="upload">Upload video file</option>
            <option value="external">External URL (YouTube, etc.)</option>
          </select>
        </div>

        {unitForm.videoType === "upload" && (
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Video file (max 500 MB)
            </label>
            <input
              type="file"
              accept="video/*"
              className="input-field"
              onChange={(e) => setUnitFile(e.target.files?.[0] ?? null)}
            />
            {editingUnitId && unitForm.videoUrl && !unitFile && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Current: {unitForm.videoUrl}
              </p>
            )}
          </div>
        )}

        {unitForm.videoType === "external" && (
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Video URL</label>
            <input
              className="input-field"
              placeholder="https://youtube.com/..."
              value={unitForm.videoUrl}
              onChange={(e) => setUnitForm({ ...unitForm, videoUrl: e.target.value })}
              required
            />
          </div>
        )}

        {/* Reading material (markdown) — optional on every unit. */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-foreground/80">
              Reading material (Markdown)
            </label>
            <div className="inline-flex rounded-md overflow-hidden border border-border/60 text-xs">
              <button
                type="button"
                className={`px-2 py-0.5 ${
                  readingTab === "write" ? "bg-primary text-primary-foreground" : "bg-muted/30"
                }`}
                onClick={() => setReadingTab("write")}
              >
                Write
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 ${
                  readingTab === "preview"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30"
                }`}
                onClick={() => setReadingTab("preview")}
              >
                Preview
              </button>
            </div>
          </div>
          {readingTab === "write" ? (
            <textarea
              className="input-field font-mono text-xs"
              rows={8}
              placeholder={"# Heading\n\nSupports **bold**, _italic_, lists, tables, `code`, and links."}
              value={unitForm.content}
              onChange={(e) => setUnitForm({ ...unitForm, content: e.target.value })}
            />
          ) : (
            <div className="prose prose-sm max-w-none rounded-md border border-border/60 bg-muted/20 p-3 min-h-[8rem]">
              {unitForm.content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{unitForm.content}</ReactMarkdown>
              ) : (
                <div className="text-xs italic text-muted-foreground/70">
                  Nothing to preview yet.
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">
            Leave empty if the unit is video-only.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={uploading}>
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <Upload size={14} /> Uploading…
              </span>
            ) : editingUnitId ? (
              "Save"
            ) : (
              "Create"
            )}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setShowUnitModal(false)}
            disabled={uploading}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
