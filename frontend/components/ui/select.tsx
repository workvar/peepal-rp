"use client";

import {
  useState, useRef, useEffect, createContext, useContext,
  ReactNode, HTMLAttributes, forwardRef,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Context ────────────────────────────────────────────────────────────────

interface SelectCtx {
  value: string;
  open: boolean;
  onSelect: (v: string) => void;
  setOpen: (o: boolean) => void;
  label: (v: string) => string;
  setLabel: (v: string, l: string) => void;
}
const Ctx = createContext<SelectCtx | null>(null);
const useSelectCtx = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("Select sub-component used outside <Select />");
  return c;
};

// ── Root ──────────────────────────────────────────────────────────────────

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  disabled?: boolean;
}

function Select({ value, defaultValue = "", onValueChange, children, disabled }: SelectProps) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const controlled = value !== undefined;
  const current = controlled ? value! : internal;

  const handleSelect = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };

  const registerLabel = (v: string, l: string) => {
    setLabels((prev) => prev[v] === l ? prev : { ...prev, [v]: l });
  };

  return (
    <Ctx.Provider value={{
      value: current,
      open,
      onSelect: handleSelect,
      setOpen: disabled ? () => {} : setOpen,
      label: (v) => labels[v] ?? v,
      setLabel: registerLabel,
    }}>
      <div className="relative" data-disabled={disabled || undefined}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────

interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  placeholder?: string;
  className?: string;
}

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ placeholder = "Select…", className, ...props }, ref) => {
    const { value, open, setOpen, label } = useSelectCtx();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-sm",
          "border border-input bg-card text-foreground",
          "ring-offset-background transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-primary/40",
          open && "border-primary/60 ring-2 ring-ring/30",
          className
        )}
        {...props}
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {value ? label(value) : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

// ── Content ───────────────────────────────────────────────────────────────

function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useSelectCtx();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      className={cn(
        "absolute z-50 top-full mt-1.5 w-full",
        "rounded-xl border border-border bg-card shadow-xl",
        "overflow-auto max-h-60 p-1",
        "slide-in-from-top animate-in duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────

interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function SelectItem({ value, children, className }: SelectItemProps) {
  const { value: current, onSelect, setLabel } = useSelectCtx();
  const selected = current === value;

  // Register readable label for the trigger display
  useEffect(() => {
    if (typeof children === "string") setLabel(value, children);
  }, [value, children, setLabel]);

  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm",
        "text-foreground transition-colors duration-100",
        "hover:bg-primary/8 focus:bg-primary/8",
        selected && "bg-primary/12 font-semibold text-primary",
        className
      )}
    >
      <span className="flex-1">{children}</span>
      {selected && <Check size={14} className="text-primary shrink-0 ml-2" />}
    </div>
  );
}

// ── Group / Label ─────────────────────────────────────────────────────────

function SelectGroup({ children }: { children: ReactNode }) {
  return <div className="py-1">{children}</div>;
}

function SelectLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </div>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-border", className)} />;
}

// ── Value (display inside trigger without rendering) ─────────────────────

function SelectValue({ placeholder }: { placeholder?: string }) {
  // Rendered inside SelectTrigger; the trigger reads context directly.
  return null;
}

export {
  Select, SelectTrigger, SelectContent, SelectItem,
  SelectGroup, SelectLabel, SelectSeparator, SelectValue,
};
