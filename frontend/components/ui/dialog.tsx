"use client";

import { useEffect, HTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Dialog root ────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return <>{children}</>;
}

// ── Overlay ────────────────────────────────────────────────────────────────

function DialogOverlay({ className, onClick, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 animate-overlay-in",
        className
      )}
      style={{
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(12px) saturate(120%)",
        WebkitBackdropFilter: "blur(12px) saturate(120%)",
      }}
      onClick={onClick}
      {...props}
    />
  );
}

// ── Content ────────────────────────────────────────────────────────────────

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  onClose?: () => void;
  /** Accent color for the header gradient stripe */
  accent?: "violet" | "cyan" | "red" | "green" | "amber";
}

const sizes = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const accentGradients = {
  violet: "#1f5d36",
  cyan:   "#0891b2",
  red:    "#dc2626",
  green:  "#059669",
  amber:  "#d97706",
};

function DialogContent({
  className,
  size = "md",
  onClose,
  accent = "violet",
  children,
  ...props
}: DialogContentProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-overlay-in"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(14px) saturate(130%)",
          WebkitBackdropFilter: "blur(14px) saturate(130%)",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full mx-4 max-h-[90vh]",
          sizes[size],
          "flex flex-col overflow-hidden",
          "animate-dialog-in",
          className
        )}
        style={{
          background: "rgb(var(--card))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1.5rem",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
        {...props}
      >
        {/* Top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] z-10"
          style={{
            background: accentGradients[accent],
            borderRadius: "1.5rem 1.5rem 0 0",
          }}
        />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 hover:scale-110 active:scale-95"
          >
            <X size={15} />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
}

function DialogHeader({ className, icon, children, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn("flex items-center gap-4 px-7 pt-8 pb-5 shrink-0", className)}
      {...props}
    >
      {icon && (
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function DialogTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-bold tracking-tight text-foreground leading-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function DialogDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground mt-1", className)} {...props}>
      {children}
    </p>
  );
}

// ── Divider between header and body ───────────────────────────────────────

function DialogDivider() {
  return (
    <div
      className="mx-7 shrink-0"
      style={{
        height: "1px",
        background: "rgb(var(--border))",
      }}
    />
  );
}

// ── Body ───────────────────────────────────────────────────────────────────

function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-7 py-5 overflow-y-auto flex-1", className)}
      {...props}
    />
  );
}

// ── Section inside body (for multi-section forms) ──────────────────────────

function DialogSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-5", className)}>
      {title && (
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-7 py-5 shrink-0",
        className
      )}
      style={{
        borderTop: "1px solid rgb(var(--border) / 0.6)",
        background: "rgb(var(--muted) / 0.3)",
      }}
      {...props}
    />
  );
}

// ── Two-column form grid helper ────────────────────────────────────────────

function DialogGrid({ cols = 2, children, className }: { cols?: 1 | 2; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(cols === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4", className)}>
      {children}
    </div>
  );
}

// ── Form field helper ──────────────────────────────────────────────────────

function DialogField({ label, error, required, children }: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}
    </div>
  );
}

export {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogDivider,
  DialogBody,
  DialogSection,
  DialogFooter,
  DialogGrid,
  DialogField,
};
