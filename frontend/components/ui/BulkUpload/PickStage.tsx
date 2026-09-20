"use client";

import { Upload, FileDown, FileText, Archive } from "lucide-react";
import { formatBytes, type BulkSchema } from "@/api/services/bulk";

// First wizard stage: download template/docs/starter kit, then pick a CSV.
export default function PickStage({
  schema,
  maxBytes,
  onTemplate,
  onDocs,
  onStarterKit,
  onChooseFile,
  fileInputRef,
  onFileChosen,
}: {
  schema: BulkSchema | null;
  maxBytes: number;
  onTemplate: () => void;
  onDocs: () => void;
  onStarterKit: () => void;
  onChooseFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChosen: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onTemplate}
          className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
          disabled={!schema}
        >
          <FileDown size={20} className="shrink-0 mt-0.5 text-primary" />
          <div>
            <div className="font-medium">CSV template</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Headers and one example row.
            </div>
          </div>
        </button>
        <button
          onClick={onDocs}
          className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
          disabled={!schema}
        >
          <FileText size={20} className="shrink-0 mt-0.5 text-primary" />
          <div>
            <div className="font-medium">Field guide (PDF)</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Column meanings, allowed values.
            </div>
          </div>
        </button>
        <button
          onClick={onStarterKit}
          className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
          disabled={!schema}
        >
          <Archive size={20} className="shrink-0 mt-0.5 text-primary" />
          <div>
            <div className="font-medium">Starter kit (ZIP)</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              CSV + instructions.txt in one download.
            </div>
          </div>
        </button>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
        <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-foreground font-medium mb-1">Upload a filled-in CSV</p>
        <p className="text-xs text-muted-foreground mb-4">
          We'll parse it and show an editable preview before anything is saved.
        </p>
        <button
          onClick={onChooseFile}
          className="btn-primary"
          disabled={!schema}
        >
          Choose file…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={onFileChosen}
        />
        <p className="text-[11px] text-muted-foreground/70 mt-3">
          Max file size: {formatBytes(maxBytes)}. Larger files? Split them into multiple uploads.
        </p>
      </div>
    </div>
  );
}
