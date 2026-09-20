"use client";

export interface Step {
  title: string;
  body: React.ReactNode;
}

interface Props {
  steps: Step[];
}

/** Numbered, vertically connected list of steps with rounded badges. */
export default function StepList({ steps }: Props) {
  return (
    <ol className="relative ml-3">
      {steps.map((step, idx) => (
        <li key={idx} className="relative pl-10 pb-6 last:pb-0">
          {idx < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute left-3 top-7 bottom-0 w-px bg-border"
            />
          )}
          <span className="absolute left-0 top-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            {idx + 1}
          </span>
          <div className="text-sm font-semibold text-foreground mb-1">{step.title}</div>
          <div className="text-sm text-muted-foreground leading-relaxed">{step.body}</div>
        </li>
      ))}
    </ol>
  );
}
