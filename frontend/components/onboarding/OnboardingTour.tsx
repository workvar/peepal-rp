"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { ONBOARDING_STEPS } from "./steps";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
}

export default function OnboardingTour({ open, onClose, tenantSlug }: Props) {
  const [index, setIndex] = useState(0);

  if (!open) return null;

  const step = ONBOARDING_STEPS[index];
  const Icon = step.icon;
  const isFirst = index === 0;
  const isLast = index === ONBOARDING_STEPS.length - 1;

  const next = () => {
    if (isLast) {
      onClose();
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));
  const skip = () => {
    onClose();
    setIndex(0);
  };

  const ctaHref = step.cta ? `/${tenantSlug}${step.cta.path}` : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgb(0 0 0 / 0.45)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        style={{ animation: "fadeInUp 250ms ease-out" }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgb(var(--primary) / 0.12)", color: "rgb(var(--primary))" }}
          >
            <Icon size={22} />
          </div>
          <button
            onClick={skip}
            aria-label="Close tour"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="px-6 pt-3 pb-6">
          <p className="text-caption-2 font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Step {index + 1} of {ONBOARDING_STEPS.length}
          </p>
          <h2 className="text-title-2 font-bold text-foreground mt-1 leading-tight">
            {step.title}
          </h2>
          <p className="text-callout text-muted-foreground mt-3 leading-relaxed">
            {step.body}
          </p>

          {ctaHref && step.cta && (
            <Link
              href={ctaHref}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "rgb(var(--primary))", color: "white" }}
            >
              {step.cta.label}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* ── Progress dots ───────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {ONBOARDING_STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === index ? 20 : 6,
                background: i <= index ? "rgb(var(--primary))" : "rgb(var(--border))",
              }}
            />
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-secondary/40">
          <button
            onClick={skip}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={back}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: "rgb(var(--primary))", color: "white" }}
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
