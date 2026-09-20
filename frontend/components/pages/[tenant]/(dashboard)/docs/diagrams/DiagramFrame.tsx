"use client";

interface Props {
  title: string;
  caption?: string;
  children: React.ReactNode;
}

/** Common bordered container so every diagram looks consistent in the docs. */
export default function DiagramFrame({ title, caption, children }: Props) {
  return (
    <figure className="rounded-xl border border-border bg-card overflow-hidden my-2">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="p-4 overflow-x-auto">{children}</div>
      {caption && (
        <figcaption className="px-4 py-2 border-t border-border text-xs text-muted-foreground italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
