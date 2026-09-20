"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Video, BookOpen } from "lucide-react";
import { LearningItem, ItemProgress } from "@/types/pages/learning/page";
import { videoSrc } from "./videoUtils";

// Renders a unit item: uploaded/external video, optional markdown reading
// material, and the Mark Complete action.
export default function UnitContent({
  item,
  progress,
  onMarkUnit,
}: {
  item: LearningItem;
  progress?: ItemProgress;
  onMarkUnit: () => void;
}) {
  return (
    <div className="mt-4">
      {item.videoType === "upload" && item.videoUrl && (
        <video
          key={`video-${item.id}`}
          src={videoSrc(item.videoType, item.videoUrl)}
          controls
          className="w-full max-h-[480px] rounded-md bg-black"
        />
      )}
      {item.videoType === "external" && item.videoUrl && (
        <div className="aspect-video w-full bg-black rounded-md overflow-hidden">
          <iframe
            key={`iframe-${item.id}`}
            src={videoSrc(item.videoType, item.videoUrl)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {(!item.videoType || item.videoType === "none") &&
        !item.content && (
          <div className="bg-muted/40 rounded-md p-6 text-center text-muted-foreground inline-flex items-center gap-2">
            <Video size={16} /> No video — reading material only
          </div>
        )}

      {/* Reading material (markdown) */}
      {item.content && (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-2 inline-flex items-center gap-1">
            <BookOpen size={13} /> Reading material
          </div>
          <div className="md-body rounded-md border border-border/60 bg-background px-5 py-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground/80">
          {progress?.status === "completed" ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 size={15} /> Completed
            </span>
          ) : (
            "Mark as watched to unlock the next item."
          )}
        </div>
        {progress?.status !== "completed" && (
          <button className="btn-primary" onClick={onMarkUnit}>
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
}
