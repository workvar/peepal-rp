"use client";

interface Props {
  id?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
}

/** A scrollable doc section with a stable id used by the side-nav anchors. */
export default function DocSection({ id, title, eyebrow, description, children }: Props) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      {eyebrow && (
        <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary mb-2">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}
