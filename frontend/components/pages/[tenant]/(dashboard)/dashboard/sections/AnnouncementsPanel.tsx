import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
}

function priorityColor(priority: string) {
  return priority === "urgent"
    ? "var(--color-category-red)"
    : priority === "high"
    ? "var(--color-category-orange)"
    : "var(--color-category-blue)";
}

export default function AnnouncementsPanel({
  announcements,
  viewAllHref,
}: {
  announcements: Announcement[];
  viewAllHref: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Megaphone size={13} /> Announcements
        </p>
        <Link href={viewAllHref} className="text-xs font-semibold text-primary flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {announcements.slice(0, 4).map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3">
            <span
              className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
              style={{ background: priorityColor(a.priority) }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
            </div>
            <span
              className="text-[11px] font-semibold shrink-0 capitalize"
              style={{ color: priorityColor(a.priority) }}
            >
              {a.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
