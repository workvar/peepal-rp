"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  label?: string;
  labelPosition?: "left" | "right";
  id?: string;
}

// Track dimensions and thumb translate values (all thumb edges stay inside track).
// md: track 44×24px, thumb 16×16px. OFF: 4px from left. ON: 24px from left (4+16+4=24, 24+16=40 < 44).
// sm: track 32×20px, thumb 14×14px. OFF: 3px from left. ON: 15px from left (3+14+3=20 ≤ 32, 15+14=29 < 32).
const cfg = {
  sm: {
    track: "w-8 h-5",
    thumb: "w-3.5 h-3.5",
    thumbOn:  "translate-x-[15px]",
    thumbOff: "translate-x-[3px]",
  },
  md: {
    track: "w-11 h-6",
    thumb: "w-4 h-4",
    thumbOn:  "translate-x-[24px]",
    thumbOff: "translate-x-[4px]",
  },
};

export function Switch({
  checked,
  onCheckedChange,
  onChange,
  disabled = false,
  size = "md",
  className,
  label,
  labelPosition = "right",
  id,
}: SwitchProps) {
  const c = cfg[size];

  const handleClick = () => {
    if (disabled) return;
    const next = !checked;
    onCheckedChange?.(next);
    onChange?.(next);
  };

  const track = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full cursor-pointer",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        c.track,
        checked ? "bg-primary" : "bg-muted-foreground/30",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm",
          "transition-transform duration-200",
          c.thumb,
          checked ? c.thumbOn : c.thumbOff,
        )}
      />
    </button>
  );

  if (!label) return track;

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2.5 select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      )}
    >
      {labelPosition === "left" && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
      {track}
      {labelPosition === "right" && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
    </label>
  );
}

export default Switch;
