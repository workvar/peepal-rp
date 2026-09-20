"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadPhoto, resolvePhotoUrl, type PhotoEntity } from "@/api/services/uploads";

interface PhotoUploadProps {
  /** Currently saved photo URL (server path or absolute). */
  value?: string | null;
  /** Called once the upload succeeds with the persisted URL. */
  onChange: (url: string) => void;
  /** Where to attach the photo on the server. */
  entity: PhotoEntity;
  /**
   * Row id on the server. Required for employee/student. May be omitted
   * for "user" (defaults to the authenticated user).
   *
   * Pass `null` to defer uploads — useful for create forms that don't yet
   * have a server id; the component will instead call `onChange` with a
   * local data URL preview, and the parent can re-upload after creation.
   */
  id?: string | null;
  /** Pixel size of the avatar circle. */
  size?: number;
  /** Display name used to derive initials when no photo is set. */
  fallbackName?: string;
  /** Optional accent colour for the initials background. */
  accent?: string;
}

const hiddenInputStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
  opacity: 0,
};

/**
 * Reusable circular avatar uploader.
 *
 * Uses the "implicit label association" pattern: the <input type="file"> is
 * nested inside a <label>. Clicking anywhere on the label opens the file
 * picker — this is the only approach that works 100% of the time across
 * all browsers and form contexts (no JS `.click()` call required).
 */
export default function PhotoUpload({
  value,
  onChange,
  entity,
  id,
  size = 88,
  fallbackName = "",
  accent = "var(--color-category-violet)",
}: PhotoUploadProps) {
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const display = localPreview || resolvePhotoUrl(value);
  const initial = (fallbackName || "?").trim().charAt(0).toUpperCase();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    // Create flows (no server id yet): stash a local data-URL preview
    // and let the parent re-upload after the row exists.
    if (id === null) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setLocalPreview(url);
        onChange(url);
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      setBusy(true);
      const url = await uploadPhoto(file, entity, id || undefined);
      setLocalPreview(null);
      onChange(url);
      toast.success("Photo updated");
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setLocalPreview(null);
    onChange("");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar — clicking anywhere opens the picker (nested input) */}
      <label
        className="relative group rounded-full overflow-hidden border border-border shrink-0 block"
        style={{
          width: size,
          height: size,
          background: display ? "transparent" : accent,
          cursor: busy ? "wait" : "pointer",
        }}
        aria-label="Change photo"
      >
        {display ? (
          // unoptimized: display may be a local data-URL preview or a backend upload
          <Image src={display} alt="profile" width={size} height={size} unoptimized className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ fontSize: size * 0.4 }}
          >
            {initial}
          </div>
        )}

        {/* Hover overlay — visually decorative only */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {busy ? (
            <Loader2 size={size * 0.3} className="text-white animate-spin" />
          ) : (
            <Camera size={size * 0.3} className="text-white" />
          )}
        </span>

        {/* Nested file input — clicking the label triggers this natively */}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          tabIndex={-1}
          style={hiddenInputStyle}
          onChange={onFileChange}
        />
      </label>

      {/* Text buttons */}
      <div className="flex flex-col gap-1.5">
        <label
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors inline-flex items-center justify-center select-none ${
            busy ? "opacity-50" : ""
          }`}
          style={{ cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? "Uploading…" : display ? "Change photo" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            tabIndex={-1}
            style={hiddenInputStyle}
            onChange={onFileChange}
          />
        </label>

        {display && !busy && (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={11} /> Remove
          </button>
        )}
        <p className="text-[10px] text-muted-foreground">PNG, JPG or WebP, max 5 MB</p>
      </div>
    </div>
  );
}
