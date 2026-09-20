"use client";

/**
 * ConfirmDialog — a reusable confirmation modal.
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
 *
 *   // Trigger:
 *   setConfirmState({
 *     title: "Delete User",
 *     message: "Are you sure you want to delete Jane Doe? This cannot be undone.",
 *     variant: "danger",
 *     onConfirm: () => dispatch(deleteUser(id)),
 *   });
 *
 *   // Render (once, at page level):
 *   <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
 */

import { AlertTriangle, Trash2, ShieldOff, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmState {
  title: string;
  message: string;
  /** "danger" → red, "warning" → amber, "info" → violet, "success" → green */
  variant?: "danger" | "warning" | "info" | "success";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  state: ConfirmState | null;
  onClose: () => void;
  loading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: "rgba(220,38,38,0.12)",
    iconColor: "#dc2626",
    iconBorder: "rgba(220,38,38,0.25)",
    btnClass: "btn-error",
    accentGradient: "#dc2626",
    defaultLabel: "Delete",
  },
  warning: {
    icon: ShieldOff,
    iconBg: "rgba(245,158,11,0.12)",
    iconColor: "#d97706",
    iconBorder: "rgba(245,158,11,0.25)",
    btnClass: "btn text-white",
    accentGradient: "#d97706",
    defaultLabel: "Confirm",
  },
  info: {
    icon: Info,
    iconBg: "rgba(31,93,54,0.12)",
    iconColor: "#1f5d36",
    iconBorder: "rgba(31,93,54,0.25)",
    btnClass: "btn-primary",
    accentGradient: "#1f5d36",
    defaultLabel: "Confirm",
  },
  success: {
    icon: CheckCircle,
    iconBg: "rgba(16,185,129,0.12)",
    iconColor: "#059669",
    iconBorder: "rgba(16,185,129,0.25)",
    btnClass: "btn-success",
    accentGradient: "#059669",
    defaultLabel: "Confirm",
  },
};

export default function ConfirmDialog({ state, onClose, loading }: ConfirmDialogProps) {
  if (!state) return null;

  const variant = state.variant ?? "danger";
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  const handleConfirm = async () => {
    await state.onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-overlay-in"
        style={{
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm animate-dialog-in flex flex-col overflow-hidden"
        style={{
          background: "rgb(var(--card))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1.5rem",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] z-10"
          style={{
            background: cfg.accentGradient,
            borderRadius: "1.5rem 1.5rem 0 0",
          }}
        />

        {/* Body */}
        <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: cfg.iconBg,
              border: `1px solid ${cfg.iconBorder}`,
            }}
          >
            <Icon size={26} style={{ color: cfg.iconColor }} />
          </div>

          {/* Text */}
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">{state.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[260px] mx-auto">
              {state.message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-7 py-5"
          style={{
            borderTop: "1px solid rgb(var(--border) / 0.6)",
            background: "rgb(var(--muted) / 0.3)",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary flex-1"
          >
            {state.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(cfg.btnClass, "flex-1")}
            style={variant === "warning" ? { background: cfg.accentGradient, boxShadow: "0 4px 14px rgba(245,158,11,0.3)" } : undefined}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              state.confirmLabel ?? cfg.defaultLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
