"use client";

interface Anchor {
  id: string;
  label: string;
}

interface Props {
  anchors: Anchor[];
}

/** Right-rail "on this page" anchor list, scoped to the current doc page. */
export default function OnPageNav({ anchors }: Props) {
  return (
    <div className="sticky top-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
        On this page
      </div>
      <ul className="space-y-1.5 border-l border-border pl-3">
        {anchors.map((a) => (
          <li key={a.id}>
            <a
              href={`#${a.id}`}
              className="text-xs text-muted-foreground hover:text-primary transition-colors block py-0.5"
            >
              {a.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
