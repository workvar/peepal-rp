"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";

/**
 * Slide-in drawer wrapping the same Sidebar for small screens.
 * Controlled by the TopBar hamburger button.
 */
export default function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={`lg:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0 }}
      />
      {/* Drawer */}
      <div
        className="absolute left-0 top-0 h-full transition-transform duration-200"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
      >
        <div className="relative h-full">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="absolute top-4 right-3 z-10 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
          <Sidebar onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
